import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Eye, EyeOff, Settings } from "lucide-react";
import "./App.css";
import CompDetails from "./components/CompDetails";
import { loadAllIlluvialData, getIlluvialImageFromData, getIlluvialByDisplayName, debugNameMatching } from "./data/illuvialData";
import { fetchLeaderboard, LeaderboardPlayer, getWinningBuilds, WinningBuild, updateRecentBuilds, testBuildsFetch, getPerformanceStats, getDebugLog, testTauriConnection } from "./data/leaderboardApi";
import { fetchLeaderboard as fetchPythonLeaderboard, getRecentWinningBuilds, testAPI, getDetailedBuilds } from "./data/pythonDataApi";

interface Build {
  id: string;
  playerName: string;
  composition: string[];
  synergies: string[];
  rank: number;
  winRate: number;
  games: number;
  timestamp: string;
  // Enhanced metadata for rich display
  description?: string;
  tip?: string;
  tier?: string;
  author?: string;
  upvotes?: number;
  downvotes?: number;
  // New fields for Illuvials and weapons
  illuvials?: string[];
  weapons?: string[];
  equipment?: string[];
  // New gameplay-focused fields
  recommendedWeapons?: string[];
  weaponBonds?: string[];
  itemPriority?: string[];
}

/*
interface GameData {
  gameId: string;
  players: Array<{
    name: string;
    rank: number;
    placement: number;
    composition: string[];
  }>;
  startTime: string;
  endTime: string;
  mode: string;
}
*/

function App() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [selectedBuild] = useState<Build | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [transparency, setTransparency] = useState(0.85);
  const [textScale, setTextScale] = useState(1.0);
  const [imageScale, setImageScale] = useState(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompDetails, setShowCompDetails] = useState(false);
  const [selectedCompForDetails, setSelectedCompForDetails] = useState<Build | null>(null);
  const [activeTab, setActiveTab] = useState<'meta-builds' | 'recent-wins'>('meta-builds');
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayer | null>(null);
  const [playerBuilds, setPlayerBuilds] = useState<WinningBuild[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [aggregatedBuilds, setAggregatedBuilds] = useState<WinningBuild[]>([]);
  const [detailedBuilds, setDetailedBuilds] = useState<any[]>([]);
  const [selectedPlayerForBuilds, setSelectedPlayerForBuilds] = useState<string | null>(null);
  const [aggregatedBuildsLoading, setAggregatedBuildsLoading] = useState(false);
  const [aggregatedBuildsError, setAggregatedBuildsError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string>('');
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [tauriTestResult, setTauriTestResult] = useState<string>('');

  // No demo data - we'll fetch real data from illuvilytics.web.app

  // Function to get augment image URL (using DataKingzWeb approach)
  const getAugmentImage = (name: string | undefined) => {
    if (!name) return '/image.png';
    
    // Use the same approach as DataKingzWeb: replace spaces with %20 + .PNG
    const imageName = name.replace(/ /g, '%20') + '.PNG';
    console.log(`🎯 Augment image URL for "${name}": ${imageName}`);
    return `https://firebasestorage.googleapis.com/v0/b/illuvilytics.firebasestorage.app/o/Augments%2F${imageName}?alt=media`;
  };

  // Function to get synergy image URL (using DataKingzWeb Firebase Storage approach)
  const getSynergyImage = (synergyName: string) => {
    if (!synergyName) return '/image.png';
    
    // Helper to normalize names for image filenames (PascalCase like DataKingzWeb)
    const toImageName = (name: string) => {
      if (!name) return '';
      // PascalCase: capitalize first letter of each word, remove spaces
      return name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('');
    };
    
    // Use Firebase Storage for class/affinity icons (same as DataKingzWeb)
    const imageName = encodeURIComponent(toImageName(synergyName));
    return `https://firebasestorage.googleapis.com/v0/b/illuvilytics.firebasestorage.app/o/class_affinity%2F${imageName}.png?alt=media`;
  };

  // Function to get weapon image URL (matching DataKingzWeb approach exactly)
  const getWeaponImage = (name: string | undefined) => {
    if (!name) return '';
    const WEAPON_IMAGE_KEYS: Record<string, string> = {
      EmberlingRod: 'RodStage1',
      GalewindBow: 'BowStage1',
      GroveSword: 'StockSwordStage1Nature',
      LavaGauntlet: 'StockGloveStage1Fire',
      SproutGuard: 'GuardStage1',
      QuakeMaulers: 'MaulersStage1',
      RippleFlail: 'FlailStage1',
      ShadowMaul: 'MaulStage1',
      StrikeBoomerang: 'BoomerangStage1',
      SylphidBlade: 'BladeStage1',
      TempestLance: 'LanceStage1',
      VineboundCleaver: 'CleaverStage1',
      FlamewardenStaff: 'StaffStage1',
      AquaBlaster: 'BlasterStage1',
      EmberBastion: 'BastionStage1',
    };
    const safeName = name.replace(/\s/g, '');
    const key = WEAPON_IMAGE_KEYS[safeName] || WEAPON_IMAGE_KEYS[name] || safeName;
    return `https://media.illuvium.io/web/NFT/Weapon/${key}/${key}_default_default_webp.2500x2500/${key}_default_default.webp`;
  };

  // Function to count affinities from illuvials
  const getAffinityCounts = (illuvials: string[]) => {
    const counts: Record<string, number> = {};
    illuvials.filter(name => name && name !== 'undefined').forEach(illuvialName => {
      const illuvial = getIlluvialByDisplayName(illuvialName);
      if (illuvial && illuvial.combatAffinity) {
        const affinity = illuvial.combatAffinity;
        counts[affinity] = (counts[affinity] || 0) + 1;
        console.log(`✅ ${illuvialName} -> ${affinity} affinity`);
      } else {
        console.log(`❌ No affinity found for ${illuvialName}`);
      }
    });
    return counts;
  };

  // Function to count classes from illuvials  
  const getClassCounts = (illuvials: string[]) => {
    const counts: Record<string, number> = {};
    illuvials.filter(name => name && name !== 'undefined').forEach(illuvialName => {
      const illuvial = getIlluvialByDisplayName(illuvialName);
      if (illuvial && illuvial.combatClass) {
        const combatClass = illuvial.combatClass;
        counts[combatClass] = (counts[combatClass] || 0) + 1;
        console.log(`✅ ${illuvialName} -> ${combatClass} class`);
      } else {
        console.log(`❌ No class found for ${illuvialName}`);
      }
    });
    return counts;
  };

  // Function to get Illuvial image URL (using local data first, then fallback to constructed URLs)
  const getIlluvialImage = (illuvialName: string): string => {
    // First, try to get the image from our local illuvial data
    const localImageURL = getIlluvialImageFromData(illuvialName);
    if (localImageURL) {

      return localImageURL;
    }
    
    // If not found in local data, fall back to the original logic
    console.log(`⚠️ No local data for "${illuvialName}", using fallback logic`);
    
    // Clean up the name for URL usage - remove non-alphanumeric and handle special cases
    const cleanName = illuvialName.replace(/[^a-zA-Z0-9]/g, '');
    
         // Special name mappings for known illuvials (DisplayName/Firebase → Line/URL)
     const nameMapping: { [key: string]: string } = {
       // Confirmed mappings from JSON files
       'rai': 'RedPanda',
       'railu': 'RedPanda', 
       'rai-lu': 'RedPanda',
       'redpanda': 'RedPanda',
       
       // Turtle family
       'archie': 'Turtle',
       'archeleon': 'Turtle',
       
       // Atlas family 
       'atlas': 'Axolotl',
       
       // Common patterns to try (will test these systematically)
       'malura': 'Malura', // Try direct match first
       'adorius': 'Adorius',
       'gnarl': 'Gnarl', 
       'slashin': 'Slashin',
       'blotto': 'Blotto',
       'jotun': 'Jotun',
       'blazenite': 'Blazenite', 
       'sear': 'Sear',
       'phorus': 'Phorus',
       'phosphorus': 'Phosphorus',
       'chukoondi': 'Chukoondi',
       'kukkaraph': 'Kukkaraph',
       'verminio': 'Verminio',
       'vermilliare': 'Vermilliare',
       'squizz': 'Squizz',
       'revo': 'Revo',
       'gyro': 'Gyro',
       'lessernaturevolante': 'VolanteNature',
       'lessnaturevolante': 'VolanteNature'
     };
    
    const lowerName = cleanName.toLowerCase();
    const mappedName = nameMapping[lowerName] || cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    
    // Official Illuvium media URL pattern: https://media.illuvium.io/web/NFT/Illuvials/{Name}Stage{1-3}/{Name}Stage{1-3}_default_default_webp.3840x2160/{Name}Stage{1-3}_default_default.webp
    const baseUrl = "https://media.illuvium.io/web/NFT/";
    
    const imageSources = [
      // Try official media URLs first with different stages (using your working format)
      `${baseUrl}Illuvials/${mappedName}Stage1/${mappedName}Stage1_default_default_webp.3840x2160/${mappedName}Stage1_default_default.webp`,
      `${baseUrl}Illuvials/${mappedName}Stage2/${mappedName}Stage2_default_default_webp.3840x2160/${mappedName}Stage2_default_default.webp`,
      `${baseUrl}Illuvials/${mappedName}Stage3/${mappedName}Stage3_default_default_webp.3840x2160/${mappedName}Stage3_default_default.webp`,
      
      // Fallback to community/alternative sources
      `https://illuvium.wiki/images/${cleanName.toLowerCase()}.png`,
      `https://static.wikia.nocookie.net/illuvium/images/${cleanName.toLowerCase()}.png`,
      `https://static.illuvium.io/illuvials/${cleanName.toLowerCase()}.png`,
      `https://static.illuvium.io/illuvials/${cleanName.toLowerCase()}.webp`,
      `https://assets.illuvium.io/illuvials/${cleanName.toLowerCase()}.png`,
      
      // Final fallback to a placeholder
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%238B5CF6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24" font-family="Arial">${illuvialName.charAt(0)}</text></svg>`
    ];
    
         console.log(`🖼️ Getting image for "${illuvialName}" -> cleaned: "${cleanName}" -> mapped to: "${mappedName}" -> URL: ${imageSources[0]}`);
    return imageSources[0]; // Start with the first source, we'll add error handling
  };

  // Function to handle image loading errors
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>, illuvialName: string) => {
    const img = event.currentTarget;
    const currentSrc = img.src;
    
    // First check if this was already a local image URL - if so, fall back to constructed URLs
    const localImageURL = getIlluvialImageFromData(illuvialName);
    if (localImageURL && currentSrc === localImageURL) {
      console.log(`❌ Local image failed for "${illuvialName}", trying fallback URLs`);
      // Use fallback logic
    }
    
    // Try the next image source - using same pattern as getIlluvialImage with proper name mapping
    const cleanName = illuvialName.replace(/[^a-zA-Z0-9]/g, '');
    
         // Special name mappings for known illuvials (same as getIlluvialImage)
     const nameMapping: { [key: string]: string } = {
       // Confirmed mappings from JSON files
       'rai': 'RedPanda',
       'railu': 'RedPanda', 
       'rai-lu': 'RedPanda',
       'redpanda': 'RedPanda',
       
       // Turtle family
       'archie': 'Turtle',
       'archeleon': 'Turtle',
       
       // Atlas family 
       'atlas': 'Axolotl',
       
       // Common patterns to try (will test these systematically)
       'malura': 'Malura', // Try direct match first
       'adorius': 'Adorius',
       'gnarl': 'Gnarl', 
       'slashin': 'Slashin',
       'blotto': 'Blotto',
       'jotun': 'Jotun',
       'blazenite': 'Blazenite', 
       'sear': 'Sear',
       'phorus': 'Phorus',
       'phosphorus': 'Phosphorus',
       'chukoondi': 'Chukoondi',
       'kukkaraph': 'Kukkaraph',
       'verminio': 'Verminio',
       'vermilliare': 'Vermilliare',
       'squizz': 'Squizz',
       'revo': 'Revo',
       'gyro': 'Gyro',
       'lessernaturevolante': 'VolanteNature',
       'lessnaturevolante': 'VolanteNature'
     };
    
    const lowerName = cleanName.toLowerCase();
    const mappedName = nameMapping[lowerName] || cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    const baseUrl = "https://media.illuvium.io/web/NFT/";
    
    const imageSources = [
      // Try official media URLs first with different stages (using your working format)
      `${baseUrl}Illuvials/${mappedName}Stage1/${mappedName}Stage1_default_default_webp.3840x2160/${mappedName}Stage1_default_default.webp`,
      `${baseUrl}Illuvials/${mappedName}Stage2/${mappedName}Stage2_default_default_webp.3840x2160/${mappedName}Stage2_default_default.webp`,
      `${baseUrl}Illuvials/${mappedName}Stage3/${mappedName}Stage3_default_default_webp.3840x2160/${mappedName}Stage3_default_default.webp`,
      
      // Fallback to community/alternative sources
      `https://illuvium.wiki/images/${cleanName.toLowerCase()}.png`,
      `https://static.wikia.nocookie.net/illuvium/images/${cleanName.toLowerCase()}.png`,
      `https://static.illuvium.io/illuvials/${cleanName.toLowerCase()}.png`,
      `https://static.illuvium.io/illuvials/${cleanName.toLowerCase()}.webp`,
      `https://assets.illuvium.io/illuvials/${cleanName.toLowerCase()}.png`,
      
      // Final fallback to a placeholder
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%238B5CF6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24" font-family="Arial">${illuvialName.charAt(0)}</text></svg>`
    ];
    
    const currentIndex = imageSources.indexOf(currentSrc);
    if (currentIndex < imageSources.length - 1) {
      const nextSrc = imageSources[currentIndex + 1];
      console.log(`Image failed: ${currentSrc} -> trying next: ${nextSrc}`);
      img.src = nextSrc;
    } else {
      // Only log when we've exhausted all options for this illuvial
      console.log(`❌ ALL IMAGE SOURCES FAILED for "${illuvialName}". Last URL: ${currentSrc}`);
    }
  };

  useEffect(() => {
    // Load illuvial data on startup
    const loadData = async () => {
      try {
        await loadAllIlluvialData();
        console.log('✅ Illuvial data loaded successfully');
        
        // Debug: Test name matching with some sample names
        debugNameMatching(['Atlas', 'Rhamphy', 'Rypter', 'Dash', 'Archie', 'Vermillia', 'Scarabok']);
        
        // Debug: Test name matching with illuvials from the build data
        debugNameMatching(['Goliant', 'Axodon', 'Fludd', 'Dualeph', 'Seeforus', 'Mah\'tu', 'Umbre', 'Artace', 'Squizz']);
      } catch (error) {
        console.error('❌ Failed to load illuvial data:', error);
      }
    };
    
    loadData();
    
    // Auto-fetch latest builds on startup
    fetchBuildsFromWebsite();
    
    // Load transparency setting
    const savedTransparency = localStorage.getItem("overlay-transparency");
    if (savedTransparency) {
      setTransparency(parseFloat(savedTransparency));
    }

    // Expose debug functions to window for testing (development only)
    if (import.meta.env.DEV) {
      (window as any).debugAPI = {
        testBuildsFetch,
        getPerformanceStats,
        clearCache: () => localStorage.removeItem('illuvium_leaderboard_cache'),
        fetchLeaderboard,
        updateRecentBuilds
      };
      console.log('🔧 Debug API exposed to window.debugAPI (development mode only)');
    }
  }, []);

  const fetchBuildsFromWebsite = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching compositions from real Firebase collections...');
      
             // CORRECTED: Use the real collection names from Firebase Console
       const allEndpoints = [
         // PRIMARY TARGET: Real compositions collection (confirmed from Firebase Console)
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/compositions?pageSize=50',
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/compositions',
         
         // SECONDARY: Other potentially useful collections
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/Squads?pageSize=50',
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/Squads',
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/matchData?pageSize=50',
         'https://firestore.googleapis.com/v1/projects/illuvilytics/databases/(default)/documents/matchResults?pageSize=50',
         
         // BACKUP: Custom API endpoints (in case they exist)
         'https://api.illuvilytics.web.app/compositions',
         'https://illuvilytics.web.app/api/compositions',
         'https://illuvilytics.web.app/api/v1/compositions',
       ];
      
      let parsedBuilds: Build[] = [];
      
             for (const endpoint of allEndpoints) {
                 console.log(`Testing API endpoint: ${endpoint}`);
        
                 try {
           const response = await fetch(endpoint, {
             method: 'GET',
             headers: {
               'Content-Type': 'application/json',
               'Accept': 'application/json',
             },
           });
           
           console.log(`Response status: ${response.status}`);
           console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
          
                     if (response.ok) {
                        const rawText = await response.text();
           console.log(`Raw response text:`, rawText.substring(0, 500));
           
           let data;
           try {
             data = JSON.parse(rawText);
           } catch (e) {
             console.log(`Failed to parse JSON:`, e);
             continue;
           }
           
           console.log(`Found data at: ${endpoint}`, data);
           console.log(`Data type:`, typeof data, `Keys:`, Object.keys(data));
           
           // Check if it's an empty Firestore collection response
           if (data && typeof data === 'object' && Object.keys(data).length === 0) {
             console.log(`Empty object - might be empty collection or authentication required`);
             
             // Try with pagination parameters
             const paginatedEndpoint = endpoint + '?pageSize=100';
             console.log(`Trying with pagination: ${paginatedEndpoint}`);
             
             try {
               const paginatedResponse = await fetch(paginatedEndpoint, {
                 method: 'GET',
                 headers: {
                   'Content-Type': 'application/json',
                   'Accept': 'application/json',
                 },
               });
               
               if (paginatedResponse.ok) {
                 const paginatedData = await paginatedResponse.json();
                 console.log(`Paginated response:`, paginatedData);
                 if (paginatedData && Object.keys(paginatedData).length > 0) {
                   data = paginatedData;
                 }
               }
             } catch (paginationError) {
               console.log(`Pagination attempt failed:`, paginationError);
             }
           }
             
             // Handle different Firebase response formats
             if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
               // Standard Firestore collection response
               parsedBuilds = parseFirestoreData(data);
               console.log(`Successfully parsed ${parsedBuilds.length} builds from Firestore collection`);
               break;
             } else if (data.documents && typeof data.documents === 'object') {
               // Firestore collection with object format
               const documentArray = Object.values(data.documents);
               if (documentArray.length > 0) {
                 parsedBuilds = parseFirestoreData({ documents: documentArray });
                 console.log(`Successfully parsed ${parsedBuilds.length} builds from Firestore object`);
                 break;
               }
             } else if (Array.isArray(data) && data.length > 0) {
               // Direct array of data
               parsedBuilds = parseIlluviticsData(data);
               console.log(`Successfully parsed ${parsedBuilds.length} builds from direct array`);
               break;
             } else if (data && Object.keys(data).length > 0) {
               // Single object or other format - try to extract any useful data
               console.log(`Found structured data, attempting to parse...`);
               try {
                 if (endpoint.includes('comps') || endpoint.includes('tierlist') || endpoint.includes('builds')) {
                   parsedBuilds = parseIlluviticsData([data]);
                   if (parsedBuilds.length > 0) {
                     console.log(`Successfully parsed ${parsedBuilds.length} builds from single object`);
                     break;
                   }
                 }
               } catch (e) {
                 console.log(`Failed to parse single object:`, e);
               }
             }
             
             console.log(`No usable data found at: ${endpoint}`);
           } else {
            console.log(`No data at: ${endpoint} (Status: ${response.status})`);
          }
        } catch (err) {
          console.log(`Error testing: ${endpoint}`, err);
        }
      }
      
      if (parsedBuilds.length > 0) {
        setBuilds(parsedBuilds);
        setError(null);
      } else {
        // If no Firebase data found, try the Tauri backend approach
        console.log('No Firebase data found, trying Tauri backend...');
        
        try {
          const response = await invoke<string>("fetch_tierlist_data");
          console.log('Response from Tauri backend:', response.length);
          
          if (response.startsWith('JSON_DATA:')) {
            const jsonData = response.substring(10);
            const data = JSON.parse(jsonData);
            parsedBuilds = parseIlluviticsData(data);
          } else if (response.startsWith('FIRESTORE_DATA:')) {
            const firestoreData = response.substring(15);
            const data = JSON.parse(firestoreData);
            parsedBuilds = parseFirestoreData(data);
          }
          
          if (parsedBuilds.length > 0) {
            setBuilds(parsedBuilds);
            setError(null);
          } else {
            setError('No build data found from any source. Data will update automatically.');
            setBuilds([]);
          }
        } catch (tauriError) {
          console.log('Tauri backend also failed:', tauriError);
          setError('Could not connect to backend. Data will update automatically.');
          setBuilds([]);
        }
      }
      
    } catch (err: any) {
      console.error('Error fetching builds:', err);
              setError(`Failed to fetch builds: ${err}. Data will update automatically.`);
      setBuilds([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard data for Recent Winning Builds tab
  const fetchLeaderboardData = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    
    try {
      console.log('🔄 Fetching leaderboard data from Python...');
      const players = await fetchPythonLeaderboard();
      setLeaderboardPlayers(players);
      console.log(`✅ Successfully loaded ${players.length} leaderboard players from Python data`);
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLeaderboardError(errorMessage);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Fetch leaderboard data when Recent Winning Builds tab is first accessed
  useEffect(() => {
    if (activeTab === 'recent-wins' && leaderboardPlayers.length === 0 && !leaderboardLoading) {
      fetchLeaderboardData();
    }
  }, [activeTab, leaderboardPlayers.length, leaderboardLoading]);

  // Auto-fetch aggregated builds when Recent Winning Builds tab is accessed for the first time
  useEffect(() => {
    if (activeTab === 'recent-wins' && aggregatedBuilds.length === 0 && !aggregatedBuildsLoading && !aggregatedBuildsError) {
      // Small delay to ensure leaderboard is loaded first if needed
      setTimeout(() => {
        handleUpdateRecentBuilds();
      }, 500);
    }
  }, [activeTab, aggregatedBuilds.length, aggregatedBuildsLoading, aggregatedBuildsError]);

  // Apply scaling settings to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
    document.documentElement.style.setProperty('--image-scale', imageScale.toString());
  }, [textScale, imageScale]);

  // Fetch winning builds for selected player
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchPlayerBuilds = async (player: LeaderboardPlayer) => {
    setBuildsLoading(true);
    setSelectedPlayer(player);
    setPlayerBuilds([]);
    
    try {
      console.log(`🔍 Fetching winning builds for ${player.username}...`);
      const builds = await getWinningBuilds(player.profileUrl);
      setPlayerBuilds(builds);
      console.log(`✅ Loaded ${builds.length} winning builds for ${player.username}`);
    } catch (error) {
      console.error('❌ Failed to fetch player builds:', error);
      setPlayerBuilds([]);
    } finally {
      setBuildsLoading(false);
    }
  };

  // Test Tauri connection
  const testTauri = async () => {
    try {
      const result = await testTauriConnection();
      setTauriTestResult(result);
      alert(`Tauri Test Result: ${result}`);
    } catch (error) {
      setTauriTestResult(`Error: ${error}`);
      alert(`Tauri Test Error: ${error}`);
    }
  };

  // Test simplified API
  const testSimplifiedAPI = async () => {
    try {
      console.log('🧪 Testing simplified API...');
      const result = await testTauriConnection();
      setTauriTestResult(result);
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTauriTestResult('Test failed: ' + error);
    }
  };

  // Fetch debug log from Rust backend
  const fetchDebugLog = async () => {
    try {
      const log = await getDebugLog();
      setDebugLog(log);
      setShowDebugLog(true);
    } catch (error) {
      console.error('❌ Failed to fetch debug log:', error);
      setDebugLog('Failed to fetch debug log: ' + error);
    }
  };

  // Update recent builds by aggregating from all top players
  const handleUpdateRecentBuilds = async () => {
    setAggregatedBuildsLoading(true);
    setAggregatedBuildsError(null);
    
    try {
      console.log('🔄 Updating recent builds from Python data...');
      const builds = await getRecentWinningBuilds();
      const detailed = await getDetailedBuilds();
      setAggregatedBuilds(builds);
      setDetailedBuilds(detailed);
      console.log(`✅ Successfully loaded ${builds.length} recent builds from Python data`);
    } catch (error) {
      console.error('❌ Failed to update recent builds:', error);
      setAggregatedBuildsError('Failed to update recent builds: ' + error);
    } finally {
      setAggregatedBuildsLoading(false);
    }
  };



  // Parse Firestore data format (based on real Firebase Console structure)
  const parseFirestoreData = (data: any): Build[] => {
    const builds: Build[] = [];
    
    try {
      console.log('Parsing Firestore data with structure:', data);
      
      // Firestore format: { documents: [{ fields: { ... } }] }
      if (data.documents && Array.isArray(data.documents)) {
        data.documents.forEach((doc: any, index: number) => {
          console.log(`Processing document ${index}:`, doc);
          
          if (doc.fields) {
            console.log(`Document fields available:`, Object.keys(doc.fields));
            console.log(`Full document fields:`, doc.fields);
            
            // Extract different types of composition data
            const illuvials: string[] = [];
            const weapons: string[] = [];
            const equipment: string[] = [];
            const augments: string[] = [];
            const synergies = new Set<string>();
            
            // Look for Illuvials specifically (creatures/characters)
            const possibleIlluvialFields = ['illuvials', 'characters', 'creatures', 'team', 'lineup'];
            const possibleWeaponFields = ['weapons', 'gear', 'items'];
            const possibleEquipmentFields = ['equipment', 'augments', 'rangerBonds', 'items'];
            
            // Extract Illuvials
            for (const fieldName of possibleIlluvialFields) {
              if (doc.fields[fieldName]?.arrayValue?.values) {
                                    console.log(`Found Illuvials in field: ${fieldName}`);
                doc.fields[fieldName].arrayValue.values.forEach((item: any, itemIndex: number) => {
                  if (item.mapValue?.fields) {
                    const itemData = item.mapValue.fields;
                    const name = itemData.name?.stringValue || itemData.id?.stringValue || `Illuvial ${itemIndex}`;
                    const type = itemData.type?.stringValue || itemData.category?.stringValue || 'Illuvial';
                    console.log(`🦄 Adding illuvial from mapValue: "${name}"`);
                    illuvials.push(name);
                    synergies.add(type);
                  } else if (item.stringValue) {
                    console.log(`🦄 Adding illuvial from stringValue: "${item.stringValue}"`);
                    illuvials.push(item.stringValue);
                  }
                });
                break;
              }
            }
            
            // Extract weapons from mainWeapon field
            if (doc.fields.mainWeapon?.mapValue?.fields) {
              const mainWeaponData = doc.fields.mainWeapon.mapValue.fields;
              console.log(`Main weapon data fields:`, Object.keys(mainWeaponData), mainWeaponData);
              const weaponName = mainWeaponData.name?.stringValue || 
                                mainWeaponData.weaponName?.stringValue ||
                                mainWeaponData.title?.stringValue ||
                                mainWeaponData.id?.stringValue || 
                                mainWeaponData.type?.stringValue ||
                                'Main Weapon';
              weapons.push(weaponName);
              console.log(`Found main weapon: ${weaponName}`);
            } else if (doc.fields.mainWeapon?.stringValue) {
              weapons.push(doc.fields.mainWeapon.stringValue);
              console.log(`Found main weapon (string): ${doc.fields.mainWeapon.stringValue}`);
            }
            
            // Extract weapons from other possible fields
            for (const fieldName of possibleWeaponFields) {
              if (doc.fields[fieldName]?.arrayValue?.values) {
                console.log(`Found weapons in field: ${fieldName}`);
                doc.fields[fieldName].arrayValue.values.forEach((item: any, itemIndex: number) => {
                  if (item.mapValue?.fields) {
                    const itemData = item.mapValue.fields;
                    const name = itemData.name?.stringValue || itemData.id?.stringValue || `Weapon ${itemIndex}`;
                    weapons.push(name);
                  } else if (item.stringValue) {
                    weapons.push(item.stringValue);
                  }
                });
                break;
              }
            }
            
            // Extract equipment/augments
            for (const fieldName of possibleEquipmentFields) {
              if (doc.fields[fieldName]?.arrayValue?.values) {
                console.log(`Found equipment in field: ${fieldName}`);
                doc.fields[fieldName].arrayValue.values.forEach((item: any, itemIndex: number) => {
                  if (item.mapValue?.fields) {
                    const itemData = item.mapValue.fields;
                    const name = itemData.name?.stringValue || itemData.id?.stringValue || `Item ${itemIndex}`;
                    const category = itemData.category?.stringValue || itemData.type?.stringValue || 'Equipment';
                    
                    // Categorize items
                    if (category.toLowerCase().includes('weapon') || category.toLowerCase().includes('gun')) {
                      weapons.push(name);
                    } else if (category.toLowerCase().includes('illuvial') || category.toLowerCase().includes('creature')) {
                      illuvials.push(name);
                    } else {
                      equipment.push(name);
                      augments.push(name);
                    }
                    synergies.add(category);
                  } else if (item.stringValue) {
                    // Try to categorize based on name
                    const itemName = item.stringValue;
                    if (itemName.toLowerCase().includes('weapon') || itemName.toLowerCase().includes('gun') || 
                        itemName.toLowerCase().includes('rifle') || itemName.toLowerCase().includes('pistol')) {
                      weapons.push(itemName);
                    } else if (itemName.toLowerCase().includes('illuvial') || itemName.toLowerCase().includes('creature') ||
                               itemName.match(/^[A-Z][a-z]+$/)) { // Proper names are likely Illuvials
                      illuvials.push(itemName);
                    } else {
                      equipment.push(itemName);
                      augments.push(itemName);
                    }
                  }
                });
                break;
              }
            }
            
            // If no specific categories found, try to extract any array data
            if (illuvials.length === 0 && weapons.length === 0 && equipment.length === 0) {
              console.log('No categorized data found, checking other fields...');
              Object.keys(doc.fields).forEach(key => {
                if (doc.fields[key]?.arrayValue?.values) {
                  doc.fields[key].arrayValue.values.forEach((item: any) => {
                    if (item.stringValue) {
                      // Put everything in equipment as fallback
                      equipment.push(item.stringValue);
                    }
                  });
                } else if (doc.fields[key]?.stringValue && !['name', 'description', 'tip', 'difficulty', 'tier', 'playstyle', 'author'].includes(key)) {
                  equipment.push(`${key}: ${doc.fields[key].stringValue}`);
                }
              });
            }
            
            // Extract real composition data
            const docId = doc.name?.split('/').pop() || `comp-${index}`;
            const realName = doc.fields.name?.stringValue || doc.fields.nickname?.stringValue || `Composition ${docId.substring(0, 8)}`;
            const description = doc.fields.description?.stringValue || '';
            const tip = doc.fields.tip?.stringValue || '';
            const tier = doc.fields.tier?.stringValue || 'C';
            const author = doc.fields.author?.stringValue || 'Unknown';
            
            // Extract new gameplay-focused data
            const recommendedWeapons: string[] = [];
            const weaponBonds: string[] = [];
            const itemPriority: string[] = [];
            
            // Extract weapon bonds from weaponBonds field
            if (doc.fields.weaponBonds?.arrayValue?.values) {
              console.log(`Found weapon bonds field with ${doc.fields.weaponBonds.arrayValue.values.length} items`);
              console.log(`Weapon bonds raw data:`, doc.fields.weaponBonds.arrayValue.values);
              doc.fields.weaponBonds.arrayValue.values.forEach((item: any, itemIndex: number) => {
                if (item.stringValue) {
                  weaponBonds.push(item.stringValue);
                  console.log(`Added weapon bond (string): ${item.stringValue}`);
                } else if (item.mapValue?.fields) {
                  const bondData = item.mapValue.fields;
                  console.log(`Bond data fields:`, Object.keys(bondData), bondData);
                  const name = bondData.name?.stringValue || 
                              bondData.bondName?.stringValue ||
                              bondData.title?.stringValue ||
                              bondData.id?.stringValue || 
                              bondData.type?.stringValue ||
                              `Bond ${itemIndex}`;
                  weaponBonds.push(name);
                  console.log(`Added weapon bond (object): ${name}`);
                }
              });
            }
            
            // Extract recommended weapons from recommendedWeapons field
            if (doc.fields.recommendedWeapons?.arrayValue?.values) {
              console.log(`Found recommended weapons field with ${doc.fields.recommendedWeapons.arrayValue.values.length} items`);
              console.log(`Recommended weapons raw data:`, doc.fields.recommendedWeapons.arrayValue.values);
              doc.fields.recommendedWeapons.arrayValue.values.forEach((item: any, itemIndex: number) => {
                if (item.stringValue) {
                  recommendedWeapons.push(item.stringValue);
                  console.log(`Added recommended weapon (string): ${item.stringValue}`);
                } else if (item.mapValue?.fields) {
                  const weaponData = item.mapValue.fields;
                  console.log(`Weapon data fields:`, Object.keys(weaponData), weaponData);
                  // Try different possible field names for weapon names
                  const name = weaponData.name?.stringValue || 
                              weaponData.weaponName?.stringValue ||
                              weaponData.title?.stringValue ||
                              weaponData.id?.stringValue || 
                              weaponData.type?.stringValue ||
                              `Weapon ${itemIndex}`;
                  recommendedWeapons.push(name);
                  console.log(`Added recommended weapon (object): ${name}`);
                }
              });
            }
            
            // Extract item priority from itemPriority field
            if (doc.fields.itemPriority?.arrayValue?.values) {
              console.log(`Found item priority field with ${doc.fields.itemPriority.arrayValue.values.length} items`);
              console.log(`Item priority raw data:`, doc.fields.itemPriority.arrayValue.values);
              doc.fields.itemPriority.arrayValue.values.forEach((item: any, itemIndex: number) => {
                if (item.stringValue) {
                  itemPriority.push(item.stringValue);
                  console.log(`Added item priority (string): ${item.stringValue}`);
                } else if (item.mapValue?.fields) {
                  const itemData = item.mapValue.fields;
                  console.log(`Item priority data fields:`, Object.keys(itemData), itemData);
                  const name = itemData.name?.stringValue || 
                              itemData.itemName?.stringValue ||
                              itemData.title?.stringValue ||
                              itemData.id?.stringValue || 
                              itemData.type?.stringValue ||
                              `Item ${itemIndex}`;
                  itemPriority.push(name);
                  console.log(`Added item priority (object): ${name}`);
                }
              });
            }
            
            // Extract votes data
            let upvotes = 0;
            let downvotes = 0;
            if (doc.fields.votes?.mapValue?.fields) {
              upvotes = parseInt(doc.fields.votes.mapValue.fields.upvotes?.integerValue || '0');
              downvotes = parseInt(doc.fields.votes.mapValue.fields.downvotes?.integerValue || '0');
            }
            
            // Calculate win rate based on votes
            const totalVotes = upvotes + downvotes;
            const calculatedWinRate = totalVotes > 0 ? upvotes / totalVotes : 0.5;
            
            console.log(`🏗️ Creating build: ${realName}, illuvials: ${illuvials.length}, weapons: ${weapons.length}, equipment: ${equipment.length}, votes: +${upvotes}/-${downvotes}, tier: ${tier}`);
            console.log(`🦄 Final illuvials array:`, illuvials);
            
            builds.push({
              id: `composition-${docId}`,
              playerName: realName,
              composition: [...illuvials, ...weapons, ...equipment].slice(0, 8), // Mix all types for fallback
              synergies: Array.from(synergies),
              rank: 1200 + Math.floor(Math.random() * 400), // Random rank for now
              winRate: Math.max(0.3, Math.min(0.95, calculatedWinRate)), // Use vote-based win rate
              games: totalVotes + Math.floor(Math.random() * 100), // Base games on votes
              timestamp: doc.updateTime || new Date().toISOString(),
              // Add rich metadata for enhanced display
              description: description,
              tip: tip,
              tier: tier,
              author: author,
              upvotes: upvotes,
              downvotes: downvotes,
              // New categorized data
              illuvials: illuvials.length > 0 ? illuvials : undefined,
              weapons: weapons.length > 0 ? weapons : undefined,
              equipment: equipment.length > 0 ? equipment : undefined,
              // New gameplay-focused data
              recommendedWeapons: recommendedWeapons.length > 0 ? recommendedWeapons : undefined,
              weaponBonds: weaponBonds.length > 0 ? weaponBonds : undefined,
              itemPriority: itemPriority.length > 0 ? itemPriority : undefined,
            });
          }
        });
        
        console.log(`Successfully parsed ${builds.length} compositions from Firestore`);
      }
    } catch (parseError) {
      console.error('Error parsing Firestore data:', parseError);
    }
    
    return builds;
  };

  // Parse JSON data from illuvilytics API
  const parseIlluviticsData = (data: any): Build[] => {
    const builds: Build[] = [];
    
    try {
      // This will depend on the actual JSON structure from illuvilytics
      // We'll need to adapt this based on what the API returns
      if (data.comps || data.builds || data.tierlist) {
        const comps = data.comps || data.builds || data.tierlist;
        
        comps.forEach((comp: any, index: number) => {
          builds.push({
            id: `illuvilytics-${comp.id || index}`,
            playerName: comp.name || comp.title || `Build ${index + 1}`,
            composition: comp.composition || comp.illuvials || comp.team || [],
            synergies: comp.synergies || comp.traits || [],
            rank: comp.rank || comp.rating || 1000,
            winRate: comp.winRate || comp.win_rate || comp.success_rate || 0.5,
            games: comp.games || comp.matches || comp.sample_size || 100,
            timestamp: comp.updated || comp.timestamp || new Date().toISOString()
          });
        });
      }
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError);
    }
    
    return builds;
  };

  /*
  const parseIlluviticsHTML = (htmlContent: string): Build[] => {
    const builds: Build[] = [];
    
    try {
      // Look for JSON data embedded in script tags
      const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis;
      let match;
      
      while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const scriptContent = match[1];
        
        // Look for JSON objects that might contain build data
        if (scriptContent.includes('comps') || scriptContent.includes('builds') || scriptContent.includes('tierlist')) {
          try {
            // Try to extract JSON from various common patterns
            const jsonMatches = [
              /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
              /window\.__DATA__\s*=\s*({.*?});/s,
              /__NEXT_DATA__.*?({.*})/s,
              /const\s+\w+\s*=\s*({.*comps.*?});/s
            ];
            
            for (const jsonRegex of jsonMatches) {
              const jsonMatch = jsonRegex.exec(scriptContent);
              if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                const parsedBuilds = parseIlluviticsData(jsonData);
                if (parsedBuilds.length > 0) {
                  builds.push(...parsedBuilds);
                  break;
                }
              }
            }
          } catch (jsonError) {
            console.log('Could not parse JSON from script tag:', jsonError);
          }
        }
      }
      
      // If no JSON found, try to parse HTML structure
      if (builds.length === 0) {
        console.log('No JSON data found, attempting HTML parsing...');
        // This would require more specific parsing based on the actual HTML structure
        // For now, we'll return empty and fall back to demo data
      }
      
    } catch (parseError) {
      console.error('Error parsing HTML:', parseError);
    }
    
    return builds;
  };
*/

  /*
  const processGameData = (games: GameData[]): Build[] => {
    const buildsMap = new Map<string, Build>();
    
    games.forEach(game => {
      game.players.forEach(player => {
        const compositionKey = player.composition.sort().join('-');
        const buildId = `${player.name}-${compositionKey}`;
        
        if (buildsMap.has(buildId)) {
          const existingBuild = buildsMap.get(buildId)!;
          existingBuild.games += 1;
          existingBuild.winRate = ((existingBuild.winRate * (existingBuild.games - 1)) + (player.placement <= 4 ? 1 : 0)) / existingBuild.games;
        } else {
          buildsMap.set(buildId, {
            id: buildId,
            playerName: player.name,
            composition: player.composition,
            synergies: extractSynergies(player.composition),
            rank: player.rank,
            winRate: player.placement <= 4 ? 1 : 0,
            games: 1,
            timestamp: game.startTime
          });
        }
      });
    });

    return Array.from(buildsMap.values())
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 20);
  };
*/

  /*
  const extractSynergies = (composition: string[]): string[] => {
    // This would analyze the composition to determine synergies
    // For now, return placeholder synergies
    return ["Nature", "Fighter", "Bulwark"];
  };
*/

  const saveSettings = () => {
    localStorage.setItem("overlay-transparency", transparency.toString());
    setShowSettings(false);
  };



  /*
  const toggleOverlay = async () => {
    try {
      await invoke("toggle_overlay");
    } catch (error) {
      console.error("Failed to toggle overlay:", error);
    }
  };
*/

  const checkForUpdates = async () => {
    try {
      const result = await invoke("check_for_updates");
      console.log("Update check result:", result);
      alert(result);
    } catch (error) {
      console.error("Update check failed:", error);
      alert(`Update check failed: ${error}`);
    }
  };

  const hideOverlay = async () => {
    try {
      await invoke("hide_overlay");
    } catch (error) {
      console.error("Failed to hide overlay:", error);
    }
  };

  const handleDragStart = async () => {
    try {
      const window = getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error("Failed to start dragging:", error);
    }
  };

  // Helper function to clean HTML from tips
  const cleanTipText = (tip: string): string => {
    if (!tip) return '';
    
    // Remove HTML tags but preserve basic formatting
    return tip
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  // Helper function to format tips with better line breaks
  const formatTipText = (tip: string): string => {
    if (!tip) return '';
    
    const cleanTip = cleanTipText(tip);
    
    // Add line breaks for better readability
    return cleanTip
      .replace(/\. /g, '.\n') // Add line breaks after sentences
      .replace(/: /g, ':\n') // Add line breaks after colons
      .replace(/\n+/g, '\n') // Remove multiple line breaks
      .trim();
  };

  // Filter builds based on search query
  const filteredBuilds = builds.filter(build => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const searchableFields = [
      build.playerName,
      build.description || '',
      build.tip || '',
      build.tier || '',
      build.author || '',
      ...(build.illuvials || []),
      ...(build.weapons || []),
      ...(build.equipment || []),
      ...(build.recommendedWeapons || []),
      ...(build.weaponBonds || []),
      ...(build.itemPriority || []),
      ...(build.composition || []),
      ...(build.synergies || [])
    ];
    
    return searchableFields.some(field => 
      field.toLowerCase().includes(query)
    );
  });

  if (!visible) {
    return (
      <div className="overlay-hidden">
        <button 
          onClick={() => setVisible(true)}
          className="show-button"
        >
          <Eye size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="overlay-container"
      style={{ 
        background: transparency < 0.9 ? `rgba(0, 0, 0, ${1.1 - transparency})` : 'transparent',
        backdropFilter: transparency < 0.9 ? `blur(${10 * (1.1 - transparency)}px)` : 'none'
      }}
    >
      <div className="overlay-header">
        <div className="header-content" style={{ cursor: 'grab', flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }} onMouseDown={handleDragStart}>
          <img 
            src="/DataKingzLogo.png" 
            alt="DataKingz" 
            className="header-logo"
            style={{ width: '32px', height: '32px', borderRadius: '6px' }}
          />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            DataKingz Overlay Gauntlet Companion
          </h2>
        </div>
        <div className="overlay-controls">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="control-button"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={hideOverlay}
            className="control-button"
            title="Hide (Ctrl+Shift+G)"
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <h3>Settings</h3>
          
          {/* Transparency Setting */}
          <div className="setting-group">
            <label>Transparency</label>
            <div className="slider-container">
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={transparency}
                onChange={(e) => setTransparency(parseFloat(e.target.value))}
                className="transparency-slider"
              />
              <div className="slider-value">{Math.round(transparency * 100)}%</div>
            </div>
          </div>

          {/* Text Scale Setting */}
          <div className="setting-group">
            <label>Text Size</label>
            <div className="slider-container">
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={textScale}
                onChange={(e) => setTextScale(parseFloat(e.target.value))}
                className="scale-slider"
              />
              <div className="slider-value">{Math.round(textScale * 100)}%</div>
            </div>
          </div>

          {/* Image Scale Setting */}
          <div className="setting-group">
            <label>Image Size</label>
            <div className="slider-container">
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={imageScale}
                onChange={(e) => setImageScale(parseFloat(e.target.value))}
                className="scale-slider"
              />
              <div className="slider-value">{Math.round(imageScale * 100)}%</div>
            </div>
          </div>

          <button onClick={saveSettings} className="save-button">
            Save Settings
          </button>

          {/* About Section */}
          <div className="setting-group">
            <h4>About</h4>
            <div className="about-content">
              <p><strong>DataKingz Overlay Gauntlet Companion</strong></p>
              <p>A desktop overlay application for Illuvium Arena Gauntlet players to access meta builds and recent winning compositions from top players.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Meta Builds from DataKingz</li>
                <li>Recent Winning Builds from top 5 players</li>
                <li>Real-time data updates</li>
                <li>Adjustable transparency</li>
                <li>Always-on-top overlay</li>
              </ul>
              <p><strong>Version:</strong> 0.3.1</p>
              <p><strong>Shortcut:</strong> Ctrl+Shift+G to toggle</p>
            </div>
          </div>

          {/* App Controls */}
          <div className="setting-group">
            <h4>App Controls</h4>
            <div className="app-controls">
              <button 
                onClick={async () => {
                  try {
                    if ((window as any).__TAURI__) {
                      // Try the force quit command first
                      try {
                        await (window as any).__TAURI__.invoke('force_quit_app');
                      } catch (invoke_error) {
                        console.log('Force quit command failed, trying regular exit:', invoke_error);
                        // Fallback to regular exit
                        await (window as any).__TAURI__.app.exit();
                      }
                    } else {
                      window.close();
                    }
                  } catch (error) {
                    console.error('Failed to quit app:', error);
                    // Final fallback: try to close the window
                    window.close();
                  }
                }} 
                className="quit-button"
              >
                Quit App
              </button>
            </div>
          </div>
        </div>
      )}

      {showDebugLog && (
        <div className="settings-panel">
          <h3>Debug Log</h3>
          <div className="setting-group">
            <textarea
              value={debugLog}
              readOnly
              className="debug-log-textarea"
              style={{ 
                width: '100%', 
                height: '300px', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                border: '1px solid #333',
                padding: '8px',
                resize: 'vertical'
              }}
            />
            <button onClick={() => setShowDebugLog(false)} className="save-button">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'meta-builds' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta-builds')}
        >
          Meta Builds
        </button>
        <button 
          className={`tab-button ${activeTab === 'recent-wins' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent-wins')}
        >
          Recent Winning Builds
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'meta-builds' && (
        <div className="tab-content">
          {/* Search Filter */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search compositions, weapons, illuvials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="builds-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading builds...</div>
        ) : (
          <div className="builds-list">
            {filteredBuilds.map((build) => (
              <div 
                key={build.id}
                className={`build-card enhanced ${selectedBuild?.id === build.id ? 'selected' : ''}`}
              >
                <div className="build-header">
                  <div className="title-section">
                    <div className="composition-title">{build.playerName}</div>
                    {build.tier && (
                      <span className={`tier-badge tier-${build.tier.toLowerCase()}`}>
                        {build.tier} Tier
                      </span>
                    )}
                  </div>
                  <div className="stats-section">
                    <div className="votes">
                      {build.upvotes && <span className="upvotes">👍 {build.upvotes}</span>}
                      {build.downvotes && <span className="downvotes">👎 {build.downvotes}</span>}
                    </div>
                  </div>
                </div>
                
                {build.description && (
                  <div className="description" 
                       dangerouslySetInnerHTML={{ 
                         __html: build.description.replace(/&lt;/g, '<').replace(/&gt;/g, '>') 
                       }} 
                  />
                )}
                
                {/* Illuvials Section - Most Important */}
                {build.illuvials && build.illuvials.length > 0 && (
                  <div className="illuvials-section">
                    <div className="section-label">🦄 Illuvials:</div>
                    <div className="illuvials-grid">
                      {build.illuvials.map((illuvial, index) => (
                        <div key={index} className="illuvial-card">
                          <img
                            src={getIlluvialImage(illuvial)}
                            alt={illuvial}
                            className="illuvial-image"
                            onError={(e) => handleImageError(e, illuvial)}
                            onLoad={() => console.log(`Image loaded successfully for: ${illuvial}`)}
                            title={illuvial}
                          />
                          <span className="illuvial-name">{illuvial}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synergies Section - Show calculated synergy counts */}
                {build.illuvials && build.illuvials.length > 0 && (
                  <div className="synergies-section">
                    <div className="section-label">✨ Synergies:</div>
                    <div className="synergies-grid">
                      {Object.entries({ ...getAffinityCounts(build.illuvials), ...getClassCounts(build.illuvials) })
                        .filter(([_, count]) => count >= 2) // Only show synergies with 2+ units
                        .sort(([,a], [,b]) => b - a) // Sort by count descending
                        .map(([synergy, count]) => (
                          <div key={synergy} className="synergy-badge">
                            <img
                              src={getSynergyImage(synergy)}
                              alt={synergy}
                              className="synergy-image"
                              onError={(e) => {
                                e.currentTarget.src = '/image.png';
                              }}
                              title={synergy}
                            />
                            <span className="synergy-name">{synergy}</span>
                            <span className="synergy-count">({count})</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Weapons Section - Second Most Important */}
                {build.weapons && build.weapons.length > 0 && (
                  <div className="weapons-section">
                    <div className="section-label">⚔️ Weapons:</div>
                    <div className="weapons-grid">
                      {build.weapons.map((weapon, index) => (
                        <div key={index} className="weapon-card">
                          <img
                            src={getWeaponImage(weapon)}
                            alt={weapon}
                            className="weapon-image"
                            onError={(e) => {
                              e.currentTarget.src = '/image.png';
                            }}
                            title={weapon}
                          />
                          <span className="weapon-name">{weapon}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Augments Section - Third Priority */}
                {build.equipment && build.equipment.length > 0 && (
                  <div className="augments-section">
                    <div className="section-label">🎯 Augments:</div>
                    <div className="augments-grid">
                      {build.equipment.slice(0, 8).map((item, index) => (
                        <div key={index} className="augment-card">
                          <img
                            src={getAugmentImage(item)}
                            alt={item}
                            className="augment-image"
                            onError={(e) => {
                              e.currentTarget.src = '/image.png';
                            }}
                            title={item}
                          />
                          <span className="augment-name">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Fallback to composition if no categorized data */}
                {(!build.illuvials || build.illuvials.length === 0) && 
                 (!build.weapons || build.weapons.length === 0) && 
                 (!build.equipment || build.equipment.length === 0) && 
                 build.composition.length > 0 && (
                  <div className="composition">
                    <div className="section-label">📋 Composition:</div>
                    <div className="composition-grid">
                      {build.composition.slice(0, 6).map((item, index) => (
                        <div key={index} className="illuvial-card">
                          <img
                            src={getIlluvialImage(item)}
                            alt={item}
                            className="illuvial-image"
                            onError={(e) => handleImageError(e, item)}
                            title={item}
                          />
                          <span className="illuvial-name">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="synergies">
                  <div className="section-label">⚡ Synergies:</div>
                  {build.synergies.map((synergy, index) => (
                    <span key={index} className="synergy-badge">
                      {synergy}
                    </span>
                  ))}
                </div>
                
                {/* New gameplay-focused sections */}
                {build.recommendedWeapons && build.recommendedWeapons.length > 0 && (
                  <div className="recommended-weapons-section">
                    <div className="section-label">🎯 Recommended Weapons:</div>
                    <div className="recommended-weapons-grid">
                      {build.recommendedWeapons.map((weapon, index) => (
                        <span key={index} className="recommended-weapon-badge">
                          {weapon}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {build.weaponBonds && build.weaponBonds.length > 0 && (
                  <div className="weapon-bonds-section">
                    <div className="section-label">🔗 Weapon Bonds:</div>
                    <div className="weapon-bonds-grid">
                      {build.weaponBonds.map((bond, index) => (
                        <span key={index} className="weapon-bond-badge">
                          {bond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {build.itemPriority && build.itemPriority.length > 0 && (
                  <div className="item-priority-section">
                    <div className="section-label">📋 Item Priority:</div>
                    <div className="item-priority-grid">
                      {build.itemPriority.map((item, index) => (
                        <span key={index} className="item-priority-badge">
                          {index + 1}. {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {build.tip && (
                  <div className="tip">
                    <div className="section-label">💡 Tip:</div>
                    <div className="tip-content">
                      {formatTipText(build.tip).split('\n').map((line, index) => (
                        <div key={index} className="tip-line">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="build-footer">
                  <span className="author">by {build.author}</span>
                  <span className="rank">Rank: {build.rank}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredBuilds.length === 0 && builds.length > 0 && (
          <div className="empty-state">
            <p>No builds match your search. Try different keywords.</p>
          </div>
        )}
        
        {builds.length === 0 && !loading && !error && (
          <div className="empty-state">
            <p>No builds loaded. Data updates automatically daily.</p>
          </div>
        )}
      </div>
        </div>
      )}

      {activeTab === 'recent-wins' && (
        <div className="tab-content">
          {/* Header */}
          <div className="leaderboard-header">
            <h3>Recent Winning Builds</h3>
            <div className="header-buttons">
              <div className="update-info">
                <small>Data updates daily at 2:00 AM</small>
              </div>
            </div>
          </div>

                    {aggregatedBuildsError && (
            <div className="error-message builds-error">
              <p>Failed to load builds - data will update automatically</p>
            </div>
          )}

          {aggregatedBuildsLoading ? (
            <div className="loading leaderboard-loading">
              <div className="loading-spinner"></div>
              <p>Loading recent winning builds from top players...</p>
            </div>
          ) : (
            <div className="builds-container">
              {/* Player Selection Section */}
              {!selectedPlayerForBuilds && (
                <div className="player-selection-section">
                  <h4 className="section-title">Select a Player to View Their Builds</h4>
                  <div className="players-grid">
                    {leaderboardPlayers.map((player) => {
                      const playerBuilds = detailedBuilds.filter(build => build.player_name === player.username);
                      return (
                        <div 
                          key={player.username}
                          className="player-card"
                          onClick={() => setSelectedPlayerForBuilds(player.username)}
                        >
                          <div className="player-rank-badge">#{player.rank}</div>
                          <div className="player-name">{player.username}</div>
                          <div className="player-builds-count">{playerBuilds.length} builds</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Back Button */}
              {selectedPlayerForBuilds && (
                <div className="back-to-players">
                  <button 
                    onClick={() => setSelectedPlayerForBuilds(null)}
                    className="back-button"
                  >
                    ← Back to Players
                  </button>
                  <h4 className="selected-player-title">
                    {selectedPlayerForBuilds} - Recent Winning Builds
                  </h4>
                </div>
              )}

              {/* Builds List */}
              {selectedPlayerForBuilds && detailedBuilds.length > 0 ? (
                <div className="recent-builds-list">
                  {detailedBuilds
                    .filter(build => build.player_name === selectedPlayerForBuilds)
                    .map((build, index) => (
                    <div key={`${build.playerUsername}-${index}`} className="recent-build-card">
                      <div className="build-header">
                        <div className="player-info">
                          <span className="player-name">{build.playerUsername}</span>
                          <span className="player-rank">#{build.playerRank}</span>
                        </div>
                        <div className="placement-info">
                          <span className="placement-badge">🥇 {build.placement}st Place</span>
                          {build.match_date && (
                            <span className="match-date">
                              {new Date(build.match_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                          {build.game_id && build.game_id !== "" && (
                            <span className="game-id">ID: {build.game_id}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="build-content">
                        {/* Weapon and Suit Section */}
                        <div className="build-equipment">
                          {build.weapon && (
                            <div className="equipment-item">
                              <strong>Weapon:</strong> {build.weapon}
                            </div>
                          )}
                          {build.suit && (
                            <div className="equipment-item">
                              <strong>Suit:</strong> {build.suit}
                            </div>
                          )}
                        </div>
                        
                        {/* Synergies Section - Show calculated synergy counts */}
                        {build.illuvials && build.illuvials.length > 0 && (
                          <div className="synergies-section">
                            <div className="section-label">✨ Synergies:</div>
                            <div className="synergies-grid">
                              {(() => {
                                const illuvialNames = build.illuvials.map((ill: any) => ill.name);
                                const affinityCounts = getAffinityCounts(illuvialNames);
                                const classCounts = getClassCounts(illuvialNames);
                                const allSynergies = { ...affinityCounts, ...classCounts };
                                
                                // Debug logging
                                console.log(`🔍 Synergies for ${build.player_name}:`, {
                                  illuvialNames,
                                  affinityCounts,
                                  classCounts,
                                  allSynergies
                                });
                                
                                // Additional debugging for each illuvial
                                illuvialNames.forEach((name: string) => {
                                  const illuvial = getIlluvialByDisplayName(name);
                                  if (illuvial) {
                                    console.log(`✅ ${name} -> ${illuvial.combatAffinity} (${illuvial.combatClass})`);
                                  } else {
                                    console.log(`❌ ${name} -> No data found`);
                                  }
                                });
                                
                                return Object.entries(allSynergies)
                                  .sort(([,a], [,b]) => b - a) // Sort by count descending
                                  .map(([synergy, count]) => {
                                    // Debug: Log each synergy being rendered
                                    console.log(`🟢 Rendering synergy: ${synergy} (${count})`);
                                    return (
                                      <div key={synergy} className="synergy-badge">
                                        <img
                                          src={getSynergyImage(synergy)}
                                          alt={synergy}
                                          className="synergy-image"
                                          onError={(e) => {
                                            e.currentTarget.src = '/image.png';
                                          }}
                                          title={synergy}
                                        />
                                        <span className="synergy-name">{synergy}</span>
                                        <span className="synergy-count">({count})</span>
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {/* Illuvials Section with Individual Cards */}
                        {build.illuvials.length > 0 && (
                          <div className="illuvials-section">
                            <div className="section-label">Illuvials:</div>
                            <div className="illuvials-grid">
                              {build.illuvials.map((illuvial: any, illuvialIndex: number) => {
                                // Use the detailed data structure where each illuvial is an object
                                const illuvialName = illuvial.name;
                                const illuvialAugments = illuvial.augments || [];
                                const isBonded = illuvial.is_bonded || false;
                                
                                return (
                                  <div key={illuvialIndex} className={`illuvial-card ${isBonded ? 'bonded' : ''}`}>
                                    <div className="illuvial-image-container">
                                      <img
                                        src={getIlluvialImage(illuvialName)}
                                        alt={illuvialName}
                                        className="illuvial-image"
                                        onError={(e) => handleImageError(e, illuvialName)}
                                        title={illuvialName}
                                      />
                                      {isBonded && (
                                        <div className="bond-indicator" title="Bonded to Ranger">
                                          🔗
                                        </div>
                                      )}
                                    </div>
                                    <span className="illuvial-name">
                                      {illuvialName}
                                      {isBonded && <span className="bond-text"> (Bonded)</span>}
                                    </span>
                                    {/* Show augments for this specific illuvial if available */}
                                    {illuvialAugments && illuvialAugments.length > 0 && (
                                      <div className="illuvial-augments">
                                        <span className="augments-label">Augments:</span>
                                        <div className="augments-grid">
                                          {illuvialAugments.map((augment: string, augmentIndex: number) => (
                                            <div key={augmentIndex} className="augment-item">
                                              <img
                                                src={getAugmentImage(augment)}
                                                alt={augment}
                                                className="augment-image"
                                                onError={(e) => {
                                                  e.currentTarget.src = '/image.png';
                                                }}
                                                title={augment}
                                              />
                                              <span className="augment-name">{augment}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Augments Section (if not shown with illuvials) */}
                        {build.augments && build.augments !== 'Unknown' && build.illuvials.length === 0 && (
                          <div className="augments-section">
                            <div className="section-label">Augments:</div>
                            <div className="augments-text">{build.augments}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedPlayerForBuilds ? (
                <div className="empty-state">
                  <p>No builds found for {selectedPlayerForBuilds}</p>
                  <small>Try selecting a different player</small>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No recent wins for top players</p>
                  <small>Data updates automatically daily</small>
                </div>
              )}
              
              {detailedBuilds.length > 0 && (
                <div className="leaderboard-footer">
                  <small>
                    {selectedPlayerForBuilds 
                      ? `Showing builds for ${selectedPlayerForBuilds} • Click "Back to Players" to see all`
                      : `Aggregated from top ${leaderboardPlayers.length} players • Auto-updated`
                    }
                  </small>
                </div>
              )}


            </div>
          )}
        </div>
      )}
      
      <div className="overlay-footer">
        <small>DataKingz Overlay Gauntlet Companion - Drag title to move • Ctrl+Shift+G to toggle</small>
      </div>

      {/* Composition Details Modal */}
      {showCompDetails && selectedCompForDetails && (
        <CompDetails 
          comp={selectedCompForDetails}
          onClose={() => {
            setShowCompDetails(false);
            setSelectedCompForDetails(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
