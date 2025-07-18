import React, { useState, useEffect } from 'react';
import { getAllIlluvialsByName, searchIlluvials, IlluvialData } from '../data/illuvialData';
import { IlluvialCard } from './IlluvialCard';

interface IlluvialBrowserProps {
  onClose: () => void;
}

export const IlluvialBrowser: React.FC<IlluvialBrowserProps> = ({ onClose }) => {
  const [allIlluvials, setAllIlluvials] = useState<Map<string, IlluvialData[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIlluvials, setFilteredIlluvials] = useState<IlluvialData[]>([]);
  const [selectedIlluvial, setSelectedIlluvial] = useState<IlluvialData | null>(null);

  useEffect(() => {
    const illuvialsMap = getAllIlluvialsByName();
    setAllIlluvials(illuvialsMap);
    
    // Initially show all illuvials (highest stage of each)
    const allIlluvialsList: IlluvialData[] = [];
    for (const [_, stages] of illuvialsMap.entries()) {
      if (stages.length > 0) {
        // Get the highest stage
        const highestStage = stages.sort((a, b) => b.stage - a.stage)[0];
        allIlluvialsList.push(highestStage);
      }
    }
    setFilteredIlluvials(allIlluvialsList.sort((a, b) => a.displayName.localeCompare(b.displayName)));
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchIlluvials(searchQuery);
      setFilteredIlluvials(results.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } else {
      // Show all illuvials (highest stage of each)
      const allIlluvialsList: IlluvialData[] = [];
      for (const [_, stages] of allIlluvials.entries()) {
        if (stages.length > 0) {
          const highestStage = stages.sort((a, b) => b.stage - a.stage)[0];
          allIlluvialsList.push(highestStage);
        }
      }
      setFilteredIlluvials(allIlluvialsList.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    }
  }, [searchQuery, allIlluvials]);

  const getAffinityColor = (affinity: string): string => {
    const colors: { [key: string]: string } = {
      'Water': '#3B82F6',
      'Fire': '#EF4444',
      'Earth': '#10B981',
      'Air': '#F59E0B',
      'Nature': '#22C55E',
      'Psion': '#8B5CF6'
    };
    return colors[affinity] || '#6B7280';
  };

  const affinityFilters = ['All', 'Water', 'Fire', 'Earth', 'Air', 'Nature', 'Psion'];
  const classFilters = ['All', 'Bulwark', 'Fighter', 'Psion', 'Rogue', 'Empath', 'Invoker'];

  const [selectedAffinity, setSelectedAffinity] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');

  const finalFilteredIlluvials = filteredIlluvials.filter(illuvial => {
    const affinityMatch = selectedAffinity === 'All' || illuvial.combatAffinity === selectedAffinity;
    const classMatch = selectedClass === 'All' || illuvial.combatClass === selectedClass;
    return affinityMatch && classMatch;
  });

  return (
    <div className="illuvial-browser-overlay">
      <div className="illuvial-browser">
        <div className="browser-header">
          <h2>Illuvial Database</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="browser-controls">
          <input
            type="text"
            placeholder="Search illuvials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <div className="filter-controls">
            <div className="filter-group">
              <label>Affinity:</label>
              <select value={selectedAffinity} onChange={(e) => setSelectedAffinity(e.target.value)}>
                {affinityFilters.map(affinity => (
                  <option key={affinity} value={affinity}>{affinity}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Class:</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {classFilters.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="browser-content">
          {selectedIlluvial ? (
            <div className="detailed-view">
              <button 
                onClick={() => setSelectedIlluvial(null)} 
                className="back-button"
              >
                ← Back to List
              </button>
              <IlluvialCard illuvial={selectedIlluvial} />
            </div>
          ) : (
            <div className="illuvials-grid">
              {finalFilteredIlluvials.map((illuvial, index) => (
                <div
                  key={`${illuvial.line}-${illuvial.stage}-${index}`}
                  className="illuvial-preview"
                  onClick={() => setSelectedIlluvial(illuvial)}
                >
                  <img
                    src={illuvial.imageURL}
                    alt={illuvial.displayName}
                    className="preview-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${getAffinityColor(illuvial.combatAffinity)}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32" font-family="Arial">${illuvial.displayName.charAt(0)}</text></svg>`;
                    }}
                  />
                  <div className="preview-info">
                    <div className="preview-name">{illuvial.displayName}</div>
                    <div className="preview-details">
                      <span className="preview-stage">Stage {illuvial.stage}</span>
                      <span 
                        className="preview-affinity"
                        style={{ color: getAffinityColor(illuvial.combatAffinity) }}
                      >
                        {illuvial.combatAffinity}
                      </span>
                      <span className="preview-class">{illuvial.combatClass}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="browser-footer">
          <small>
            Showing {finalFilteredIlluvials.length} illuvials • Click an illuvial for detailed information
          </small>
        </div>
      </div>
    </div>
  );
}; 