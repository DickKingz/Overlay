import React from 'react';
import { IlluvialData } from '../data/illuvialData';

interface IlluvialCardProps {
  illuvial: IlluvialData;
  className?: string;
  onClick?: () => void;
}

export const IlluvialCard: React.FC<IlluvialCardProps> = ({ illuvial, className = '', onClick }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getAffinityColor = (affinity: string): string => {
    const colors: { [key: string]: string } = {
      'Water': '#3B82F6', // Blue
      'Fire': '#EF4444',  // Red
      'Earth': '#10B981', // Green
      'Air': '#F59E0B',   // Amber
      'Nature': '#22C55E', // Green
      'Psion': '#8B5CF6'  // Purple
    };
    return colors[affinity] || '#6B7280'; // Gray fallback
  };

  const getClassIcon = (className: string): string => {
    const icons: { [key: string]: string } = {
      'Bulwark': '🛡️',
      'Fighter': '⚔️',
      'Psion': '🧠',
      'Rogue': '🗡️',
      'Empath': '💚',
      'Invoker': '✨'
    };
    return icons[className] || '❓';
  };

  return (
    <div 
      className={`illuvial-card-detailed ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="illuvial-header">
        <div className="illuvial-image-container">
          <img
            src={illuvial.imageURL}
            alt={illuvial.displayName}
            className="illuvial-image-large"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23${getAffinityColor(illuvial.combatAffinity).substring(1)}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48" font-family="Arial">${illuvial.displayName.charAt(0)}</text></svg>`;
            }}
          />
          <div className="illuvial-stage-badge">Stage {illuvial.stage}</div>
        </div>
        
        <div className="illuvial-info">
          <h3 className="illuvial-name">{illuvial.displayName}</h3>
          <div className="illuvial-line">Line: {illuvial.line}</div>
          
          <div className="illuvial-traits">
            <div 
              className="trait-badge affinity"
              style={{ backgroundColor: getAffinityColor(illuvial.combatAffinity) }}
            >
              {illuvial.combatAffinity}
            </div>
            <div className="trait-badge class">
              {getClassIcon(illuvial.combatClass)} {illuvial.combatClass}
            </div>
            <div className="trait-badge tier">
              Tier {illuvial.tier}
            </div>
          </div>
        </div>
      </div>

      <div className="illuvial-stats">
        <h4>Combat Stats</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Health:</span>
            <span className="stat-value">{formatNumber(illuvial.stats.maxHealth)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Attack:</span>
            <span className="stat-value">{formatNumber(illuvial.stats.attackPhysicalDamage)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Speed:</span>
            <span className="stat-value">{illuvial.stats.attackSpeed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Energy Cost:</span>
            <span className="stat-value">{formatNumber(illuvial.stats.energyCost)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Phys Resist:</span>
            <span className="stat-value">{illuvial.stats.physicalResist}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Energy Resist:</span>
            <span className="stat-value">{illuvial.stats.energyResist}%</span>
          </div>
        </div>
      </div>

      {illuvial.abilities.displayDescription && (
        <div className="illuvial-abilities">
          <h4>Omega Ability</h4>
          <div className="ability-description">
            {illuvial.abilities.displayDescription.split('\n').map((line, index) => (
              <div key={index} className="ability-line">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {illuvial.summary && (
        <div className="illuvial-lore">
          <h4>Summary</h4>
          <p className="lore-text">{illuvial.summary}</p>
        </div>
      )}
    </div>
  );
}; 