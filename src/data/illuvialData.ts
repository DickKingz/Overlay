// Utility for loading and accessing Illuvial data from CombatUnitData
export interface IlluvialData {
  displayName: string;
  line: string;
  stage: number;
  tier: number;
  combatAffinity: string;
  combatClass: string;
  imageURL: string;
  animationURL?: string;
  intro?: string;
  summary?: string;
  stats: {
    maxHealth: number;
    attackPhysicalDamage: number;
    attackEnergyDamage: number;
    attackSpeed: number;
    moveSpeed: number;
    energyCost: number;
    physicalResist: number;
    energyResist: number;
  };
  abilities: {
    displayDescription: string;
  };
}

// Cache for loaded illuvial data
let illuvialDataCache: Map<string, IlluvialData> | null = null;
let illuvialsByDisplayName: Map<string, IlluvialData[]> | null = null;

// Function to transform raw JSON data to our IlluvialData interface
const transformIlluvialData = (rawData: any): IlluvialData => {
  return {
    displayName: rawData.DisplayName || rawData.Name || 'Unknown',
    line: rawData.Line || 'Unknown',
    stage: rawData.Stage || 1,
    tier: rawData.Tier || 1,
    combatAffinity: rawData.CombatAffinity || 'Neutral',
    combatClass: rawData.CombatClass || 'Fighter',
    imageURL: rawData.ImageURL || rawData.Image || '',
    animationURL: rawData.AnimationURL,
    intro: rawData.Intro,
    summary: rawData.Summary,
    stats: {
      maxHealth: rawData.MaxHealth || 100,
      attackPhysicalDamage: rawData.AttackPhysicalDamage || 0,
      attackEnergyDamage: rawData.AttackEnergyDamage || 0,
      attackSpeed: rawData.AttackSpeed || 1,
      moveSpeed: rawData.MoveSpeed || 1,
      energyCost: rawData.EnergyCost || 0,
      physicalResist: rawData.PhysicalResist || 0,
      energyResist: rawData.EnergyResist || 0,
    },
    abilities: {
      displayDescription: rawData.OmegaAbility?.DisplayDescription || rawData.Abilities?.DisplayDescription || 'No ability description available',
    }
  };
};

// Load all illuvial data from CombatUnitData directory dynamically
export const loadAllIlluvialData = async (): Promise<Map<string, IlluvialData>> => {
  if (illuvialDataCache) {
    return illuvialDataCache;
  }

  console.log('🔄 Loading all illuvial data from CombatUnitData...');
  
  illuvialDataCache = new Map();
  illuvialsByDisplayName = new Map();

  // Use Vite's glob import to dynamically load all JSON files
  const modules = import.meta.glob('./CombatUnitData/*.json', { eager: true });
  
  console.log(`📁 Found ${Object.keys(modules).length} potential illuvial files`);
  
  for (const [path, module] of Object.entries(modules)) {
    try {
      const rawData = (module as any).default || module;
      
      // Skip non-illuvial files (like Dummy, Crate, Ranger)
      if (path.includes('/Dummy/') || path.includes('/Crate/') || path.includes('/Ranger/')) {
        continue;
      }
      
      // Skip files that don't have the expected illuvial structure
      if (!rawData.DisplayName && !rawData.Name) {
        continue;
      }
      
      const data = transformIlluvialData(rawData);
      
      // Use a unique key combining display name and stage
      const key = `${data.displayName}_Stage${data.stage}`;
      illuvialDataCache.set(key, data);
      
      // Also index by display name for easy lookup
      if (!illuvialsByDisplayName!.has(data.displayName)) {
        illuvialsByDisplayName!.set(data.displayName, []);
      }
      illuvialsByDisplayName!.get(data.displayName)!.push(data);
      
      console.log(`✅ Loaded ${data.displayName} (${data.line} Stage ${data.stage})`);
    } catch (error) {
      console.warn(`❌ Failed to load illuvial data from ${path}:`, error);
    }
  }
  
  console.log(`🎯 Loaded ${illuvialDataCache.size} illuvials from CombatUnitData`);
  console.log(`📋 Available DisplayNames:`, Array.from(illuvialsByDisplayName!.keys()).slice(0, 10), '...');
  return illuvialDataCache;
};

// Get illuvial data by display name (e.g., "Atlas", "Phyri")
export const getIlluvialByDisplayName = (displayName: string): IlluvialData | null => {
  if (!illuvialsByDisplayName) {
    console.warn('Illuvial data not loaded yet. Call loadAllIlluvialData() first.');
    return null;
  }
  
  // First try exact match
  const matches = illuvialsByDisplayName.get(displayName);
  if (matches && matches.length > 0) {
    // Return the highest stage available
    return matches.sort((a, b) => b.stage - a.stage)[0];
  }
  
  // Try case-insensitive search
  for (const [name, illuvials] of illuvialsByDisplayName.entries()) {
    if (name.toLowerCase() === displayName.toLowerCase()) {
      return illuvials.sort((a, b) => b.stage - a.stage)[0];
    }
  }
  
  // Try partial match (e.g., "Fludd" might match "FluddStage1")
  for (const [name, illuvials] of illuvialsByDisplayName.entries()) {
    if (name.toLowerCase().includes(displayName.toLowerCase()) || 
        displayName.toLowerCase().includes(name.toLowerCase())) {
      return illuvials.sort((a, b) => b.stage - a.stage)[0];
    }
  }
  
  // If no match found, try searching by line name as fallback
  return getIlluvialByLineName(displayName);
};

// Get illuvial data by line name (e.g., "Turtle", "Elk") - fallback function
export const getIlluvialByLineName = (lineName: string): IlluvialData | null => {
  if (!illuvialDataCache) {
    return null;
  }
  
  const results: IlluvialData[] = [];
  
  for (const illuvial of illuvialDataCache.values()) {
    if (illuvial.line.toLowerCase() === lineName.toLowerCase()) {
      results.push(illuvial);
    }
  }
  
  if (results.length > 0) {
    // Return the highest stage available
    return results.sort((a, b) => b.stage - a.stage)[0];
  }
  
  return null;
};

// Get illuvial image URL from local data with enhanced matching
export const getIlluvialImageFromData = (illuvialName: string): string | null => {
  const illuvial = getIlluvialByDisplayName(illuvialName);
  if (illuvial) {
    console.log(`✅ Found match for: "${illuvialName}" -> ${illuvial.displayName} (${illuvial.line} Stage ${illuvial.stage})`);
    return illuvial.imageURL;
  } else {
    console.log(`❌ No match found for: "${illuvialName}"`);
    return null;
  }
};

// Debug function to test name matching
export const debugNameMatching = (testNames: string[]): void => {
  if (!illuvialsByDisplayName) {
    console.log('❌ Illuvial data not loaded yet');
    return;
  }
  
  console.log('🔍 Testing name matching...');
  console.log('📋 Available DisplayNames:', Array.from(illuvialsByDisplayName.keys()));
  
  testNames.forEach(name => {
    const result = getIlluvialByDisplayName(name);
    if (result) {
      console.log(`✅ "${name}" -> ${result.displayName} (${result.line} Stage ${result.stage}) - Affinity: ${result.combatAffinity}, Class: ${result.combatClass}`);
    } else {
      console.log(`❌ "${name}" -> No match found`);
    }
  });
};

// Get all illuvials grouped by display name
export const getAllIlluvialsByName = (): Map<string, IlluvialData[]> => {
  if (!illuvialsByDisplayName) {
    return new Map();
  }
  return new Map(illuvialsByDisplayName);
};

// Search illuvials by various criteria
export const searchIlluvials = (query: string): IlluvialData[] => {
  if (!illuvialDataCache) {
    return [];
  }
  
  const results: IlluvialData[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const illuvial of illuvialDataCache.values()) {
    if (
      illuvial.displayName.toLowerCase().includes(lowerQuery) ||
      illuvial.line.toLowerCase().includes(lowerQuery) ||
      illuvial.combatAffinity.toLowerCase().includes(lowerQuery) ||
      illuvial.combatClass.toLowerCase().includes(lowerQuery)
    ) {
      results.push(illuvial);
    }
  }
  
  return results;
}; 