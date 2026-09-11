import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

export default function MapLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="map-legend-panel">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
        title="Toggle Traffic Legend"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={13} color="#2563EB" />
          <span className="legend-header" style={{ margin: 0 }}>Traffic Legend</span>
        </div>
        {isExpanded ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
      </button>
      
      {isExpanded && (
        <div style={{ marginTop: '10px' }}>
          {/* Continuous Thermal Spectrum */}
          <div className="legend-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>Thermal Density:</span>
              <span>Free &rarr; Gridlock</span>
            </div>
            <div className="gradient-bar"></div>
            <div className="gradient-labels" style={{ width: '100%' }}>
              <span>Free Flow</span>
              <span>Moderate</span>
              <span>Gridlock</span>
            </div>
          </div>

          {/* Path Vehicle Spectrum */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>
              Corridor Congestion &amp; Opacity
            </div>

            <div className="legend-item">
              <div style={{ width: '14px', height: '4px', background: '#DC2626', opacity: 1.0, borderRadius: '2px' }}></div>
              <span>&gt; 85% &bull; Crimson Red &bull; 100% Opacity</span>
            </div>

            <div className="legend-item">
              <div style={{ width: '14px', height: '4px', background: '#EA580C', opacity: 0.9, borderRadius: '2px' }}></div>
              <span>70 - 85% &bull; Vibrant Orange &bull; 90% Opacity</span>
            </div>

            <div className="legend-item">
              <div style={{ width: '14px', height: '4px', background: '#D97706', opacity: 0.55, borderRadius: '2px' }}></div>
              <span>50 - 70% &bull; Amber &bull; 55% Opacity</span>
            </div>

            <div className="legend-item">
              <div style={{ width: '14px', height: '3px', background: '#10B981', opacity: 0.15, borderRadius: '2px' }}></div>
              <span>&lt; 30% &bull; Low Flow &bull; ~8% Opacity (Faint)</span>
            </div>
          </div>

          {/* Markers */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <div className="legend-item">
              <span style={{ fontSize: '11px' }}>📷</span>
              <span>District Hubs (9,600 Cams)</span>
            </div>
            <div className="legend-item">
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#2563EB', border: '1.5px solid white' }}></div>
              <span>Mandatory Turn Cameras</span>
            </div>
            <div className="legend-item">
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#059669', border: '1.5px solid white' }}></div>
              <span>1-km Linear Spacing Posts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
