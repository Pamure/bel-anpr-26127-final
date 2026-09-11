import React from 'react';
import { Shield, Flame, Route, Video, HelpCircle } from 'lucide-react';

export default function Header({ 
  showContinuousHeat,
  setShowContinuousHeat,
  showPathSpectrum,
  setShowPathSpectrum,
  showCameras,
  setShowCameras,
  onOpenGuide,
  congestedCorridorCount = 0
}) {
  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <div className="brand-icon-box">
          <Shield size={18} />
        </div>
        <div className="brand-text">
          <div className="brand-name">
            BEL URBAN TRAFFIC ANALYTICS
            <span className="badge-pill">9,600 CAMS</span>
          </div>
          <div className="brand-subtitle">
            NCT Delhi Multi-Camera ANPR Density &amp; Thermal Spectrum
          </div>
        </div>
      </div>

      <div className="header-center-info">
        {/* Streamlined 3 Core Layer Toggle Pills */}
        <div className="layer-pill-group">
          <button 
            className={`layer-toggle-btn ${showContinuousHeat ? 'active' : ''}`}
            onClick={() => setShowContinuousHeat(!showContinuousHeat)}
            title="Toggle Continuous Thermal Heatmap"
          >
            <Flame size={14} color={showContinuousHeat ? '#EA580C' : '#64748B'} />
            <span>Heatmap</span>
          </button>

          <button 
            className={`layer-toggle-btn ${showPathSpectrum ? 'active' : ''}`}
            onClick={() => setShowPathSpectrum(!showPathSpectrum)}
            title="Toggle Congested Arterial Corridors (High-Density Orange & Red Chokepoints)"
          >
            <Route size={14} color={showPathSpectrum ? '#2563EB' : '#64748B'} />
            <span>Corridors</span>
            {congestedCorridorCount > 0 && (
              <span style={{
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                marginLeft: '4px',
                border: '1px solid #FECACA'
              }}>
                {congestedCorridorCount}
              </span>
            )}
          </button>

          <button 
            className={`layer-toggle-btn ${showCameras ? 'active' : ''}`}
            onClick={() => setShowCameras(!showCameras)}
            title="Toggle 9,600 ANPR Cameras & District Hubs"
          >
            <Video size={14} color={showCameras ? '#059669' : '#64748B'} />
            <span>Cameras</span>
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* Minimal Guide Button */}
        <button 
          onClick={onOpenGuide}
          className="guide-icon-btn"
          title="Controls & Navigation Guide"
        >
          <HelpCircle size={15} />
          <span>Guide</span>
        </button>
      </div>
    </header>
  );
}
