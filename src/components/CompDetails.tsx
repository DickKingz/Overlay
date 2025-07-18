import React, { useEffect, useState } from 'react';
import { getIlluvialImageFromData } from '../data/illuvialData';

interface CompDetailsProps {
  comp: any;
  onClose?: () => void;
}

// Safe accessor function to prevent undefined errors (commented out - not currently used)
// const safeGet = (obj: any, path: string, defaultValue: any = '') => {
//   try {
//     return path.split('.').reduce((o, p) => o?.[p], obj) ?? defaultValue;
//   } catch {
//     return defaultValue;
//   }
// };

// Helper functions
const stripHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
};

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

const getAugmentImage = (name: string | undefined) => {
  if (!name) return '/image.png';
  
  // Use the same approach as DataKingzWeb: replace spaces with %20 + .PNG
  const imageName = name.replace(/ /g, '%20') + '.PNG';
  return `https://firebasestorage.googleapis.com/v0/b/illuvilytics.firebasestorage.app/o/Augments%2F${imageName}?alt=media`;
};

// Utility functions (commented out - not currently used)
// const getAffinityCounts = (illuvials: any[]) => {
//   const counts: Record<string, number> = {};
//   for (const illu of illuvials) {
//     if (illu.affinities && illu.affinities.length > 0) {
//       for (const aff of illu.affinities) {
//         counts[aff] = (counts[aff] || 0) + 1;
//       }
//     }
//   }
//   return counts;
// };

// const getClassCounts = (illuvials: any[]) => {
//   const counts: Record<string, number> = {};
//   for (const illu of illuvials) {
//     if (illu.classes && illu.classes.length > 0) {
//       for (const cls of illu.classes) {
//         counts[cls] = (counts[cls] || 0) + 1;
//       }
//     }
//   }
//   return counts;
// };

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

const renderDifficulty = (level: number) => (
  <div className="flex items-center gap-1">
    {[...Array(level || 1)].map((_, idx) => (
      <span key={idx} className="inline-block w-4 h-4 bg-yellow-400 rounded-full" />
    ))}
  </div>
);

const CompDetails: React.FC<CompDetailsProps> = ({ comp, onClose }) => {
  if (!comp) {
    return null;
  }

  console.log('🔍 CompDetails received data:', comp);

  const illuvials = (comp.illuvials || []).filter((name: string) => name && name !== 'undefined');
  const weapons = (comp.weapons || []).filter((name: string) => name && name !== 'undefined');
  const equipment = (comp.equipment || []).filter((name: string) => name && name !== 'undefined');

  console.log('📊 Filtered data:', { illuvials, weapons, equipment });
  const [ampDisplayNameLookup, setAmpDisplayNameLookup] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load amp display names if needed
    // This would be adapted based on your data structure
    setAmpDisplayNameLookup({});
  }, []);

  return (
    <div className="comp-details-modal">
      <div className="comp-details-content p-4 md:p-8 flex flex-col gap-4 md:gap-8">
        
        {/* Header with close button */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Composition Details
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Overview Section */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{comp.name || 'Untitled Composition'}</h3>
              <div className="text-gray-300 mb-4">
                {comp.description ? stripHtml(comp.description) : 'No description available.'}
              </div>
              {comp.tags && comp.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {comp.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {comp.playstyle && (
                <div>
                  <span className="text-gray-400">Playstyle:</span>
                  <span className="ml-2 text-white">{comp.playstyle}</span>
                </div>
              )}
              {comp.difficulty && (
                <div>
                  <span className="text-gray-400">Difficulty:</span>
                  <div className="mt-1">{renderDifficulty(Array.isArray(comp.difficulty) ? comp.difficulty[0] : comp.difficulty)}</div>
                </div>
              )}
              {comp.nickname && (
                <div>
                  <span className="text-gray-400">Author:</span>
                  <span className="ml-2 text-cyan-300 font-semibold">{comp.nickname}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Weapon Priority Section */}
        {comp.recommendedWeapons && comp.recommendedWeapons.length > 0 && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h3 className="text-lg md:text-xl font-bold text-purple-300 mb-3 md:mb-4">Weapon Priority</h3>
            <div className="space-y-4 md:space-y-6">
              {comp.recommendedWeapons.map((rec: any, idx: number) => (
                <div key={idx} className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 mb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <img
                      src={getWeaponImage(rec.weapon?.name || rec.name)}
                      alt={rec.weapon?.name || rec.name}
                      className="weapon-image object-contain rounded-lg border border-slate-600"
                      onError={(e) => {
                        e.currentTarget.src = '/image.png';
                      }}
                    />
                    <div>
                      <div className="text-purple-200 font-bold text-lg">{rec.weapon?.name || rec.name}</div>
                      <div className="flex gap-2 mt-1">
                        {(rec.weapon?.affinities || rec.affinities || []).map((aff: string, i: number) => (
                          <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-cyan-400/30 text-cyan-300 bg-cyan-400/10">
                            <img
                              src={getSynergyImage(aff)}
                              alt={aff}
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span>{aff}</span>
                          </div>
                        ))}
                        {(rec.weapon?.classes || rec.classes || []).map((cls: string, i: number) => (
                          <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-purple-400/30 text-purple-300 bg-purple-400/10">
                            <img
                              src={getSynergyImage(cls)}
                              alt={cls}
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span>{cls}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {rec.amps && rec.amps.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold text-cyan-200 mb-1">Recommended Amps:</div>
                      <div className="flex flex-wrap gap-2">
                        {rec.amps.map((amp: any, ampIdx: number) => (
                          <span key={ampIdx} className="inline-flex items-center px-3 py-1 rounded-full bg-purple-700/20 border border-purple-400 text-purple-200 text-xs font-bold">
                            {ampDisplayNameLookup[amp.id] || amp.DisplayName || amp.Name || amp.name || amp.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Illuvials Section */}
        {illuvials && illuvials.length > 0 && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h3 className="text-lg md:text-xl font-bold text-cyan-300 mb-3 md:mb-4">Illuvials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {illuvials.map((illuvial: any, idx: number) => {
                const illuvialName = typeof illuvial === 'string' ? illuvial : illuvial?.name;
                
                return (
                <div
                  key={illuvialName || idx}
                  className="bg-slate-900/80 rounded-xl p-3 md:p-4 border border-cyan-700/20 shadow hover:shadow-cyan-400/20 transition-shadow flex flex-col items-center gap-2 md:gap-3 min-h-[160px] max-h-[200px] w-full max-w-[180px]"
                >
                   <img
                     src={getIlluvialImageFromData(illuvialName) || illuvial.image}
                     alt={illuvialName}
                     className="illuvial-image rounded-xl border border-slate-700 mb-1 md:mb-2 bg-slate-800 flex-shrink-0"
                     onError={(e) => {
                       e.currentTarget.src = '/image.png';
                     }}
                   />
                  <div className="text-sm md:text-base font-bold text-white mb-1 text-center max-w-full truncate">{illuvialName}</div>
                  <div className="flex flex-wrap gap-2 justify-center mb-1">
                    {(illuvial.affinities || []).map((aff: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-cyan-400/30 text-cyan-300 bg-cyan-400/10 font-semibold">
                        <img
                          src={getSynergyImage(aff)}
                          alt={aff}
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>{aff}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(illuvial.classes || []).map((cls: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-purple-400/30 text-purple-300 bg-purple-400/10 font-semibold">
                        <img
                          src={getSynergyImage(cls)}
                          alt={cls}
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>{cls}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
              })}
            </div>
          </section>
        )}

        {/* Augment Priority Section */}
        {comp.augments && comp.augments.length > 0 && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h3 className="text-lg md:text-xl font-bold text-purple-300 mb-3 md:mb-4">Augment Priority</h3>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap py-1 md:py-2 justify-center md:justify-start">
              {comp.augments.map((augment: any, idx: number) => (
                <React.Fragment key={augment.id || idx}>
                  <div className="flex flex-col items-center">
                    <img
                      src={getAugmentImage(augment.name) || augment.image}
                      alt={augment.name}
                      className="augment-image object-contain rounded-xl border border-slate-700 bg-slate-800 shadow"
                      title={augment.name}
                      onError={(e) => {
                        e.currentTarget.src = '/image.png';
                      }}
                    />
                    <span className="text-xs text-purple-200 mt-1 text-center max-w-[60px] md:max-w-[70px] truncate">
                      {augment.name}
                    </span>
                  </div>
                  {idx < comp.augments.length - 1 && (
                    <svg className="w-6 h-6 text-cyan-400 mx-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}

        {/* Strategy Section */}
        {((comp.phases && comp.phases.length > 0) || (comp.rounds && comp.rounds.length > 0)) && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h3 className="text-xl font-bold text-purple-300 mb-4">
              Strategy{' '}
              <span className="text-xs text-cyan-400 ml-2">
                {comp.phases ? '(Game Phases)' : '(Rounds)'}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(comp.phases || comp.rounds || []).map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-900/80 rounded-xl p-5 border border-cyan-700/30 shadow flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-cyan-400" />
                    <span className="font-bold text-cyan-200 text-lg">
                      {item.phase || `Rounds ${item.start}-${item.end}`}
                    </span>
                  </div>
                  <div className="text-gray-200 text-base leading-relaxed whitespace-pre-line min-h-[48px]">
                    {item.strategy || item.notes ? stripHtml(item.strategy || item.notes) : (
                      <span className="italic text-gray-400">No strategy provided.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tips Section */}
        {comp.tip && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Tips
            </h2>
            <div className="text-gray-300 leading-relaxed">
              {stripHtml(comp.tip)}
            </div>
          </section>
        )}

        {/* Positioning Section - Placeholder for now */}
        {comp.positioning && comp.positioning.length > 0 && (
          <section className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-4 md:p-6 border border-cyan-500/20 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Positioning
            </h2>
            <div className="text-gray-300">
              Positioning data available - visual board component would go here
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default CompDetails; 