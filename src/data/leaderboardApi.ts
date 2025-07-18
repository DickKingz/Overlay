// Leaderboard API integration for Illuvium Analytics
export interface LeaderboardPlayer {
  username: string;
  profileUrl: string;
  rank: number;
}

const CACHE_KEY = 'illuvium_leaderboard_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Performance optimization constants
const FETCH_TIMEOUT = 15000; // 15 seconds
const MAX_CONCURRENT_REQUESTS = 3;
const DEBOUNCE_DELAY = 1000; // 1 second

// Global state for request management
let activeRequests = new Set<string>();
let debounceTimers = new Map<string, NodeJS.Timeout>();

// Use Rust proxy for HTTP requests to bypass CORS
async function fetchWithProxy(url: string): Promise<Response> {
  try {
    // Check if we're in a Tauri environment
    const isTauri = typeof window !== 'undefined' && 
                   (window as any).__TAURI__ && 
                   typeof (window as any).__TAURI__.invoke === 'function';
    
    console.log('🔍 Tauri detection:', {
      windowExists: typeof window !== 'undefined',
      tauriExists: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      invokeExists: typeof window !== 'undefined' && typeof (window as any).__TAURI__?.invoke === 'function',
      isTauri: isTauri
    });
    
    if (isTauri) {
      console.log('🔄 Using Tauri proxy for request');
      const responseText = await (window as any).__TAURI__.invoke('fetch_with_proxy', { url });
      
      // Create a mock Response object that matches the fetch API
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(responseText),
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        })
      } as Response;
    } else {
      // Fallback to regular fetch if Tauri is not available (development mode)
      console.log('⚠️ Tauri not available, using regular fetch (may fail due to CORS)');
      
      // Try to use a CORS proxy for development
      const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      
      try {
        return await fetch(corsProxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://illuvilytics.web.app'
          }
        });
      } catch (corsError) {
        console.log('❌ CORS proxy failed, trying direct fetch...');
        
        // Last resort: try direct fetch (will likely fail due to CORS)
        return fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      }
    }
  } catch (error) {
    // Create a mock error Response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ fetchWithProxy error:', errorMessage);
    return {
      ok: false,
      status: 500,
      statusText: errorMessage,
      text: () => Promise.reject(new Error(errorMessage)),
      headers: new Headers()
    } as Response;
  }
}

interface CachedData {
  data: LeaderboardPlayer[];
  timestamp: number;
}

/**
 * Fetch top 5 players from Illuvium Analytics leaderboard
 * with caching, debouncing, and error handling
 */
export async function fetchLeaderboard(): Promise<LeaderboardPlayer[]> {
  const requestKey = 'leaderboard';
  
  // Check if request is already in progress
  if (activeRequests.has(requestKey)) {
    console.log('🔄 Leaderboard fetch already in progress, skipping...');
    throw new Error('Request already in progress');
  }

  try {
    // Check cache first
    const cached = getCachedLeaderboard();
    if (cached) {
      console.log('📊 Using cached leaderboard data');
      return cached;
    }

    // Add to active requests
    activeRequests.add(requestKey);
    
    console.log('🔄 Fetching fresh leaderboard data from illuvilytics.web.app');
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    try {
      // Fetch the analytics page with timeout using Rust proxy
      const response = await fetchWithProxy('https://illuvilytics.web.app/analytics/players');

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlText = await response.text();
      const players = parseLeaderboardHTML(htmlText);
      
      // Cache the results
      setCachedLeaderboard(players);
      
      console.log(`✅ Successfully fetched ${players.length} players from leaderboard`);
      return players;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Failed to fetch leaderboard:', error);
    
    // Try to return cached data even if expired as fallback
    const fallbackCache = localStorage.getItem(CACHE_KEY);
    if (fallbackCache) {
      try {
        const parsed = JSON.parse(fallbackCache) as CachedData;
        console.log('⚠️ Using expired cache as fallback');
        return parsed.data;
      } catch {
        // Cache is corrupted, continue to throw
      }
    }
    
    // Show user-friendly error with development mode hint
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (!errorMessage.includes('already in progress') && !errorMessage.includes('aborted')) {
      const isTauri = typeof window !== 'undefined' && 
                     (window as any).__TAURI__ && 
                     typeof (window as any).__TAURI__.invoke === 'function';
      const isDevelopment = !isTauri;
      
      if (isDevelopment) {
        console.log('🔄 Development mode detected, but no mock data provided');
        throw new Error('Development mode: No mock data available');
      } else {
        alert(`Failed to load leaderboard: ${errorMessage}\n\nPlease check your internet connection and try again.`);
      }
    }
    
    throw error;
  } finally {
    // Remove from active requests
    activeRequests.delete(requestKey);
  }
}

/**
 * Parse HTML content to extract leaderboard data
 */
function parseLeaderboardHTML(html: string): LeaderboardPlayer[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const players: LeaderboardPlayer[] = [];

  try {
    // Try multiple selectors to find leaderboard entries
    const selectors = [
      '.leaderboard-entry',
      'tr.player-row',
      '.player-entry',
      'tbody tr',
      '.ranking-row'
    ];

    let entries: NodeListOf<Element> | null = null;
    
    for (const selector of selectors) {
      entries = doc.querySelectorAll(selector);
      if (entries.length > 0) {
        console.log(`🎯 Found ${entries.length} entries using selector: ${selector}`);
        break;
      }
    }

    if (!entries || entries.length === 0) {
      throw new Error('No leaderboard entries found. Website structure may have changed.');
    }

    // Extract data from each entry (limit to top 5)
    for (let i = 0; i < Math.min(entries.length, 5); i++) {
      const entry = entries[i];
      
      // Try multiple approaches to extract player data
      const playerData = extractPlayerData(entry, i + 1);
      
      if (playerData) {
        players.push(playerData);
      }
    }

    if (players.length === 0) {
      throw new Error('Could not extract player data. Website structure may have changed.');
    }

    return players;

  } catch (error) {
    console.error('❌ Failed to parse leaderboard HTML:', error);
    throw new Error(`Failed to parse leaderboard data: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }
}

/**
 * Extract player data from a leaderboard entry element
 */
function extractPlayerData(entry: Element, fallbackRank: number): LeaderboardPlayer | null {
  try {
    // Try multiple selectors for username
    const usernameSelectors = [
      '.player-name',
      '.username',
      '.name',
      'td:nth-child(2)',
      'a[href*="/profile/"]',
      '.player-link'
    ];

    let username = '';
    let profileUrl = '';

    for (const selector of usernameSelectors) {
      const element = entry.querySelector(selector);
      if (element) {
        username = element.textContent?.trim() || '';
        
        // Check if it's a link element or contains a link
        if (element.tagName === 'A') {
          profileUrl = (element as HTMLAnchorElement).href;
        } else {
          const link = element.querySelector('a[href*="/profile/"]');
          if (link) {
            profileUrl = (link as HTMLAnchorElement).href;
          }
        }
        
        if (username) break;
      }
    }

    // Try multiple selectors for rank
    const rankSelectors = [
      '.rank',
      '.position',
      'td:first-child',
      '.ranking'
    ];

    let rank = fallbackRank;
    for (const selector of rankSelectors) {
      const element = entry.querySelector(selector);
      if (element) {
        const rankText = element.textContent?.trim();
        if (rankText) {
          const parsedRank = parseInt(rankText.replace(/[^\d]/g, ''));
          if (!isNaN(parsedRank)) {
            rank = parsedRank;
            break;
          }
        }
      }
    }

    // Ensure we have at least a username
    if (!username) {
      console.warn(`⚠️ Could not extract username for entry ${fallbackRank}`);
      return null;
    }

    // Build profile URL if not found
    if (!profileUrl && username) {
      profileUrl = `https://illuvilytics.web.app/profile/${encodeURIComponent(username)}`;
    }

    return {
      username,
      profileUrl,
      rank
    };

  } catch (error) {
    console.warn(`⚠️ Failed to extract data for entry ${fallbackRank}:`, error);
    return null;
  }
}

/**
 * Get cached leaderboard data if still valid
 */
function getCachedLeaderboard(): LeaderboardPlayer[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedData;
    const now = Date.now();
    
    if (now - data.timestamp < CACHE_DURATION) {
      return data.data;
    }
    
    // Cache expired
    localStorage.removeItem(CACHE_KEY);
    return null;

  } catch (error) {
    console.warn('⚠️ Failed to read cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Cache leaderboard data with timestamp
 */
function setCachedLeaderboard(players: LeaderboardPlayer[]): void {
  try {
    const cacheData: CachedData = {
      data: players,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Cached leaderboard data');

  } catch (error) {
    console.warn('⚠️ Failed to cache leaderboard data:', error);
  }
}

/**
 * Clear cached leaderboard data (useful for testing)
 */
export function clearLeaderboardCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('🗑️ Cleared leaderboard cache');
}

// Winning builds functionality
export interface WinningBuild {
  placement: number;
  illuvials: string[];
  augments: string;
  suit: string;
  weapon: string;
  matchDate?: string;
  playerUsername?: string;
  playerRank?: number;
  bonded_illuvials?: string[];
}

/**
 * Fetch winning builds from a player's profile page with optimizations
 * @param profileUrl - The player's profile URL or username
 * @returns Array of winning build objects
 */
export async function getWinningBuilds(profileUrl: string): Promise<WinningBuild[]> {
  const requestKey = `builds-${profileUrl}`;
  
  // Check if request is already in progress
  if (activeRequests.has(requestKey)) {
    console.log(`🔄 Builds fetch for ${profileUrl} already in progress, skipping...`);
    return [];
  }

  // Check concurrent request limit
  if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    console.log(`⚠️ Max concurrent requests reached, skipping ${profileUrl}`);
    return [];
  }

  try {
    activeRequests.add(requestKey);
    
    console.log(`🔍 Fetching winning builds for profile: ${profileUrl}`);
    
    // Construct full URL if only username/partial URL provided
    let fullUrl = profileUrl;
    if (!profileUrl.startsWith('http')) {
      // Handle both username and partial URLs
      const cleanUrl = profileUrl.replace(/^\/+/, ''); // Remove leading slashes
      fullUrl = `https://illuvilytics.web.app/players/${cleanUrl}`;
    }
    
    console.log(`🌐 Fetching from URL: ${fullUrl}`);
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    try {
      // Fetch the profile page with timeout using Rust proxy
      const response = await fetchWithProxy(fullUrl);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlText = await response.text();
      const builds = parseWinningBuildsHTML(htmlText);
      
      console.log(`✅ Successfully extracted ${builds.length} winning builds`);
      return builds;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Failed to fetch winning builds:', error);
    
    // Check if we're in development mode and provide mock data
    const isTauri = typeof window !== 'undefined' && 
                   (window as any).__TAURI__ && 
                   typeof (window as any).__TAURI__.invoke === 'function';
    const isDevelopment = !isTauri;
    if (isDevelopment) {
      console.log('🔄 Development mode detected, but no mock data provided');
      return [];
    }
    
    // Don't show alert for profile fetching errors, just log and return empty
    // This is less disruptive than the main leaderboard fetch failures
    return [];
  } finally {
    activeRequests.delete(requestKey);
  }
}

/**
 * Parse HTML content to extract winning builds from recent matches
 */
function parseWinningBuildsHTML(html: string): WinningBuild[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const builds: WinningBuild[] = [];

  try {
    console.log('🔍 Parsing profile HTML for winning builds...');
    
    // Try multiple selectors to find recent matches section
    const matchSelectors = [
      '.recent-matches-table tr',
      '.matches-table tbody tr',
      '.match-history tr',
      '.recent-matches tr',
      '.game-history tr',
      'table tr.match-row',
      '[data-testid="match-row"]',
      '.match-entry'
    ];

    let matchRows: NodeListOf<Element> | null = null;
    let usedSelector = '';
    
    for (const selector of matchSelectors) {
      matchRows = doc.querySelectorAll(selector);
      if (matchRows.length > 0) {
        usedSelector = selector;
        console.log(`🎯 Found ${matchRows.length} match rows using selector: ${selector}`);
        break;
      }
    }

    if (!matchRows || matchRows.length === 0) {
      console.warn('⚠️ No match rows found. Trying alternative approach...');
      // Try to find any table rows or divs that might contain match data
      matchRows = doc.querySelectorAll('tr, .match, .game-row, .battle-result');
      console.log(`🔄 Found ${matchRows.length} potential match elements`);
    }

    if (matchRows.length === 0) {
      console.log('ℹ️ No matches found on profile page');
      return builds;
    }

    let winningMatchesFound = 0;
    
    // Process each match row to find winning builds (limit to 5)
    for (let i = 0; i < matchRows.length && winningMatchesFound < 5; i++) {
      const row = matchRows[i];
      
      try {
        const buildData = extractWinningBuildData(row, i + 1);
        
        if (buildData && buildData.placement === 1) {
          builds.push(buildData);
          winningMatchesFound++;
          console.log(`✅ Extracted winning build ${winningMatchesFound}:`, buildData);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to extract data from match row ${i + 1}:`, error);
      }
    }

    console.log(`📊 Total winning builds extracted: ${builds.length}`);
    return builds;

  } catch (error) {
    console.error('❌ Failed to parse winning builds HTML:', error);
    return builds; // Return whatever we managed to extract
  }
}

/**
 * Extract winning build data from a match row element
 */
function extractWinningBuildData(row: Element, rowIndex: number): WinningBuild | null {
  try {
    // Extract placement (must be 1st place)
    const placement = extractPlacement(row);
    if (placement !== 1) {
      return null; // Only interested in winning builds
    }

    // Extract illuvials list
    const illuvials = extractIlluvials(row);
    
    // Extract augments
    const augments = extractText(row, [
      '.augments',
      '.augment-list',
      '[data-testid="augments"]',
      '.build-augments',
      '.item-augments'
    ]) || '';

    // Extract suit
    const suit = extractText(row, [
      '.suit',
      '.armor',
      '[data-testid="suit"]',
      '.equipment-suit',
      '.player-suit'
    ]) || '';

    // Extract weapon
    const weapon = extractText(row, [
      '.weapon',
      '.weapon-name',
      '[data-testid="weapon"]',
      '.primary-weapon',
      '.equipped-weapon'
    ]) || '';

    // Extract match date if available
    const matchDate = extractText(row, [
      '.match-date',
      '.date',
      '.timestamp',
      '[data-testid="date"]',
      '.game-time'
    ]) || '';

    // Validate that we have some meaningful data
    if (illuvials.length === 0 && !augments && !suit && !weapon) {
      console.warn(`⚠️ Row ${rowIndex}: No meaningful build data found`);
      return null;
    }

    return {
      placement,
      illuvials,
      augments,
      suit,
      weapon,
      matchDate
    };

  } catch (error) {
    console.warn(`⚠️ Failed to extract build data from row ${rowIndex}:`, error);
    return null;
  }
}

/**
 * Extract placement from match row
 */
function extractPlacement(row: Element): number {
  const placementSelectors = [
    '.placement',
    '.rank',
    '.position',
    '[data-testid="placement"]',
    '.match-rank',
    '.final-position'
  ];

  for (const selector of placementSelectors) {
    const element = row.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text) {
        // Handle various formats: "1st", "1", "#1", "1st Place", etc.
        const match = text.match(/(\d+)/);
        if (match) {
          const placement = parseInt(match[1]);
          if (placement === 1) {
            console.log(`🥇 Found 1st place match with selector: ${selector}`);
            return placement;
          }
        }
      }
    }
  }

  // Check for winner indicators (crowns, gold badges, etc.)
  const winnerSelectors = [
    '.winner',
    '.first-place',
    '.champion',
    '.victory',
    '.win'
  ];

  for (const selector of winnerSelectors) {
    const element = row.querySelector(selector);
    if (element) {
      console.log(`🏆 Found winner indicator with selector: ${selector}`);
      return 1;
    }
  }

  // Check for crown/trophy emojis or icons
  const rowText = row.textContent?.toLowerCase() || '';
  if (rowText.includes('👑') || rowText.includes('🏆') || rowText.includes('🥇')) {
    console.log('🎖️ Found winner emoji in text');
    return 1;
  }

  return 0; // Not a winning match
}

/**
 * Extract illuvials list from match row
 */
function extractIlluvials(row: Element): string[] {
  const illuvialsSelectors = [
    '.illuvials-list li',
    '.illuvials li',
    '.team-list li',
    '.composition li',
    '[data-testid="illuvials"] li',
    '.build-illuvials li',
    '.squad-members li'
  ];

  for (const selector of illuvialsSelectors) {
    const elements = row.querySelectorAll(selector);
    if (elements.length > 0) {
      const illuvials = Array.from(elements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 0)
        .map(text => text!) as string[];
      
      if (illuvials.length > 0) {
        console.log(`🎮 Found ${illuvials.length} illuvials with selector: ${selector}`);
        return illuvials;
      }
    }
  }

  // Try broader selectors for illuvial names
  const broadSelectors = [
    '.illuvials',
    '.team',
    '.composition',
    '.squad',
    '.build-team'
  ];

  for (const selector of broadSelectors) {
    const element = row.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text) {
        // Try to split by common delimiters
        const illuvials = text
          .split(/[,;|]/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        if (illuvials.length > 0) {
          console.log(`🎯 Extracted illuvials from text with selector: ${selector}`);
          return illuvials;
        }
      }
    }
  }

  console.warn('⚠️ No illuvials found in match row');
  return [];
}

/**
 * Extract text content using multiple selectors
 */
function extractText(row: Element, selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = row.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Update recent builds by aggregating winning builds from top players
 * This function fetches top players and their winning builds in parallel with debouncing
 */
export async function updateRecentBuilds(): Promise<WinningBuild[]> {
  const requestKey = 'update-recent-builds';
  
  // Clear existing debounce timer
  const existingTimer = debounceTimers.get(requestKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
    debounceTimers.delete(requestKey);
  }
  
  // Return a promise that resolves after debouncing
  return new Promise((resolve, reject) => {
    const debounceTimer = setTimeout(async () => {
      try {
        debounceTimers.delete(requestKey);
        
        // Check if request is already in progress
        if (activeRequests.has(requestKey)) {
          console.log('🔄 Recent builds update already in progress, skipping...');
          throw new Error('Request already in progress');
        }
        
        activeRequests.add(requestKey);
        
        console.log('🔄 Starting updateRecentBuilds - fetching top players and their winning builds...');
        
        // Step 1: Get top 5 players
        const topPlayers = await fetchLeaderboard();
        
        if (topPlayers.length === 0) {
          console.warn('⚠️ No top players found');
          resolve([]);
          return;
        }
        
        console.log(`📊 Found ${topPlayers.length} top players, fetching their winning builds...`);
        
        // Step 2: Fetch winning builds for all players in parallel using Promise.all
        // Batch requests to respect concurrent limit
        const batchSize = Math.min(MAX_CONCURRENT_REQUESTS, topPlayers.length);
        const allBuilds: WinningBuild[] = [];
        
        for (let i = 0; i < topPlayers.length; i += batchSize) {
          const batch = topPlayers.slice(i, i + batchSize);
          const buildPromises = batch.map(async (player) => {
            try {
              const builds = await getWinningBuilds(player.profileUrl);
              
              // Step 3: Add player metadata to each build
              return builds.map(build => ({
                ...build,
                playerUsername: player.username,
                playerRank: player.rank
              }));
            } catch (error) {
              console.warn(`⚠️ Failed to fetch builds for ${player.username}:`, error);
              return []; // Return empty array if player's builds fail
            }
          });
          
          // Wait for current batch to complete
          const batchResults = await Promise.all(buildPromises);
          allBuilds.push(...batchResults.flat());
          
          // Small delay between batches to be respectful
          if (i + batchSize < topPlayers.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`📈 Aggregated ${allBuilds.length} total winning builds from ${topPlayers.length} players`);
        
        // Step 4: Sort builds by recency (if timestamps available) or by player rank
        const sortedBuilds = allBuilds.sort((a, b) => {
          // Primary sort: by match date if available (most recent first)
          if (a.matchDate && b.matchDate) {
            return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
          }
          
          // Secondary sort: if one has date and other doesn't, prioritize the one with date
          if (a.matchDate && !b.matchDate) return -1;
          if (!a.matchDate && b.matchDate) return 1;
          
          // Tertiary sort: by player rank (lower rank number = higher position)
          const rankA = a.playerRank || 999;
          const rankB = b.playerRank || 999;
          return rankA - rankB;
        });
        
        console.log(`✅ Successfully aggregated and sorted ${sortedBuilds.length} recent winning builds`);
        
        // Log some stats for debugging
        const playerStats = topPlayers.map(player => {
          const playerBuilds = sortedBuilds.filter(build => build.playerUsername === player.username);
          return `${player.username}: ${playerBuilds.length} builds`;
        });
        console.log('📊 Builds per player:', playerStats.join(', '));
        
        resolve(sortedBuilds);
        
      } catch (error) {
        console.error('❌ Failed to update recent builds:', error);
        
        // Check if we're in development mode
        const isTauri = typeof window !== 'undefined' && 
                       (window as any).__TAURI__ && 
                       typeof (window as any).__TAURI__.invoke === 'function';
        const isDevelopment = !isTauri;
        if (isDevelopment) {
          console.log('🔄 Development mode detected, but no mock data provided');
          resolve([]);
          return;
        }
        
        reject(error);
      } finally {
        activeRequests.delete(requestKey);
      }
    }, DEBOUNCE_DELAY);
    
    debounceTimers.set(requestKey, debounceTimer);
  });
}

/**
 * Helper function to format build data for display
 */
export function formatBuildForDisplay(build: WinningBuild): string {
  const parts = [];
  
  if (build.playerUsername) {
    parts.push(`${build.playerUsername} - ${build.placement}st Place`);
  }
  
  if (build.illuvials.length > 0) {
    parts.push(`Illuvials: ${build.illuvials.join(', ')}`);
  }
  
  if (build.augments) {
    parts.push(`Augments: ${build.augments}`);
  }
  
  if (build.suit) {
    parts.push(`Suit: ${build.suit}`);
  }
  
  if (build.weapon) {
    parts.push(`Weapon: ${build.weapon}`);
  }
  
  if (build.matchDate) {
    parts.push(`Date: ${build.matchDate}`);
  }
  
  return parts.join('\n');
}

/**
 * Test function that mocks fetch with sample HTML to test parsing
 * This function helps debug and validate the HTML parsing logic
 */
export async function testBuildsFetch(): Promise<void> {
  console.log('🧪 Running testBuildsFetch with mock HTML...');
  
  // Mock HTML for leaderboard testing
  const mockLeaderboardHTML = `
    <!DOCTYPE html>
    <html>
    <head><title>Illuvium Analytics</title></head>
    <body>
      <div class="leaderboard">
        <div class="leaderboard-entry">
          <div class="rank">1</div>
          <div class="player-name">ProPlayer123</div>
          <a href="/profile/ProPlayer123">Profile</a>
        </div>
        <div class="leaderboard-entry">
          <div class="rank">2</div>
          <div class="player-name">EliteGamer</div>
          <a href="/profile/EliteGamer">Profile</a>
        </div>
        <div class="leaderboard-entry">
          <div class="rank">3</div>
          <div class="player-name">TopTier</div>
          <a href="/profile/TopTier">Profile</a>
        </div>
      </div>
    </body>
    </html>
  `;

  // Mock HTML for player profile with winning builds
  const mockProfileHTML = `
    <!DOCTYPE html>
    <html>
    <head><title>Player Profile</title></head>
    <body>
      <div class="recent-matches-table">
        <div class="match-entry">
          <div class="placement">1</div>
          <div class="illuvials-list">
            <li>Axolotl</li>
            <li>Pterodactyl</li>
            <li>SeaScorpion</li>
          </div>
          <div class="augments">Chronoflux, Fatesealer</div>
          <div class="suit">AdaptiveCarapace</div>
          <div class="weapon">AquaBlaster</div>
          <div class="match-date">2024-01-15</div>
        </div>
        <div class="match-entry">
          <div class="placement">2</div>
          <div class="illuvials-list">
            <li>Turtle</li>
            <li>Elk</li>
          </div>
          <div class="augments">Furyheart</div>
          <div class="suit">GuardiansGrid</div>
          <div class="weapon">PowerDiverter</div>
        </div>
        <div class="match-entry">
          <div class="placement">1</div>
          <div class="illuvials-list">
            <li>Mammoth</li>
            <li>PolarBear</li>
            <li>Monkier</li>
          </div>
          <div class="augments">ApexSupercharger, ArcaneAccelerator</div>
          <div class="suit">Lifewell</div>
          <div class="weapon">PrimevalForce</div>
          <div class="match-date">2024-01-14</div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // Test leaderboard parsing
    console.log('🔍 Testing leaderboard HTML parsing...');
    const players = parseLeaderboardHTML(mockLeaderboardHTML);
    console.log('📊 Parsed leaderboard players:', players);
    
    if (players.length === 0) {
      console.warn('⚠️ No players parsed from mock leaderboard HTML - selectors may need updating');
    } else {
      console.log(`✅ Successfully parsed ${players.length} players from mock leaderboard`);
      players.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.username} (Rank: ${player.rank}) - ${player.profileUrl}`);
      });
    }

    // Test profile builds parsing
    console.log('\n🔍 Testing profile builds HTML parsing...');
    const builds = parseWinningBuildsHTML(mockProfileHTML);
    console.log('🎮 Parsed winning builds:', builds);
    
    if (builds.length === 0) {
      console.warn('⚠️ No builds parsed from mock profile HTML - selectors may need updating');
    } else {
      console.log(`✅ Successfully parsed ${builds.length} winning builds from mock profile`);
      builds.forEach((build, index) => {
        console.log(`  Build ${index + 1}:`);
        console.log(`    Placement: ${build.placement}`);
        console.log(`    Illuvials: ${build.illuvials.join(', ') || 'None'}`);
        console.log(`    Augments: ${build.augments || 'None'}`);
        console.log(`    Suit: ${build.suit || 'None'}`);
        console.log(`    Weapon: ${build.weapon || 'None'}`);
        console.log(`    Date: ${build.matchDate || 'Unknown'}`);
      });
    }

    // Test the complete flow with mock data
    console.log('\n🔄 Testing complete aggregation flow...');
    
    // Mock the fetch function temporarily for testing
    const originalFetch = window.fetch;
    let fetchCallCount = 0;
    
    // Simple mock implementation without jest
    window.fetch = ((url: string) => {
      fetchCallCount++;
      console.log(`📡 Mock fetch called for: ${url}`);
      
      if (url.includes('analytics/players')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockLeaderboardHTML)
        } as Response);
      } else if (url.includes('players/')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockProfileHTML)
        } as Response);
      }
      
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as typeof fetch;

    console.log('🧪 Test completed successfully! Check console output above for parsed results.');
    console.log(`📊 Total mock fetch calls made: ${fetchCallCount}`);
    
    // Restore original fetch
    window.fetch = originalFetch;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Performance monitoring and diagnostics
 */
export async function testTauriConnection(): Promise<string> {
  try {
    const isTauri = typeof window !== 'undefined' && 
                   (window as any).__TAURI__ && 
                   typeof (window as any).__TAURI__.invoke === 'function';
    
    if (isTauri) {
      const result = await (window as any).__TAURI__.invoke('test_tauri_connection');
      return result;
    } else {
      return 'Tauri not available';
    }
  } catch (error) {
    return `Tauri test failed: ${error}`;
  }
}

export async function getDebugLog(): Promise<string> {
  try {
    // Check if we're in a Tauri environment
    const isTauri = typeof window !== 'undefined' && 
                   (window as any).__TAURI__ && 
                   typeof (window as any).__TAURI__.invoke === 'function';
    
    if (isTauri) {
      const logContent = await (window as any).__TAURI__.invoke('get_debug_log');
      return logContent || 'No debug log found';
    } else {
      return `Debug log only available in built application. Tauri detection: ${JSON.stringify({
        windowExists: typeof window !== 'undefined',
        tauriExists: typeof window !== 'undefined' && !!(window as any).__TAURI__,
        invokeExists: typeof window !== 'undefined' && typeof (window as any).__TAURI__?.invoke === 'function',
        isTauri: isTauri
      })}`;
    }
  } catch (error) {
    return `Failed to get debug log: ${error}`;
  }
}

export function getPerformanceStats(): {
  activeRequests: number;
  activeRequestsList: string[];
  debounceTimers: number;
  cacheStatus: string;
} {
  const cacheData = localStorage.getItem(CACHE_KEY);
  let cacheStatus = 'empty';
  
  if (cacheData) {
    try {
      const parsed = JSON.parse(cacheData) as CachedData;
      const age = Date.now() - parsed.timestamp;
      const remainingTime = CACHE_DURATION - age;
      
      if (remainingTime > 0) {
        cacheStatus = `valid (${Math.round(remainingTime / 1000 / 60)} min remaining)`;
      } else {
        cacheStatus = 'expired';
      }
    } catch {
      cacheStatus = 'corrupted';
    }
  }

  return {
    activeRequests: activeRequests.size,
    activeRequestsList: Array.from(activeRequests),
    debounceTimers: debounceTimers.size,
    cacheStatus
  };
} 