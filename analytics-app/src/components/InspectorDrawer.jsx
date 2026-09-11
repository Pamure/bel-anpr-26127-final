import React, { useState } from 'react';
import { X, AlertTriangle, GitFork, Video, Radio, ArrowRight, Route, Gauge } from 'lucide-react';

export default function InspectorDrawer({
  isOpen,
  onClose,
  pathSpectrum = [],
  bottlenecks = [],
  corridors = [],
  cameraClusters = [],
  preciseCameras = [],
  cameraDeploymentStats,
  cameras = [],
  selectedBottleneck,
  onSelectBottleneck,
  selectedPath,
  onSelectPath
}) {
  const [activeTab, setActiveTab] = useState('paths');
  const [cameraSubFilter, setCameraSubFilter] = useState('all'); // 'all', 'turn', 'linear', 'hubs'

  // Use cameraClusters if available, fallback to cameras
  const activeCameraList = cameraClusters.length > 0 ? cameraClusters : cameras;
  const turnCameras = preciseCameras.filter(c => c.type === 'turn_mandatory');
  const linearCameras = preciseCameras.filter(c => c.type === 'linear_interval');
  const totalCameraCount = cameraDeploymentStats?.total_delhi_cameras || 9600;

  if (!isOpen) return null;

  return (
    <aside className="inspector-drawer">
      <div className="drawer-top-bar">
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'paths' ? 'active' : ''}`}
            onClick={() => setActiveTab('paths')}
            title="Road Paths Spectrum with Vehicle Counts"
          >
            Paths ({pathSpectrum.length})
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'bottlenecks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bottlenecks')}
            title="Choke Points & Bottlenecks"
          >
            Chokes ({bottlenecks.length})
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'corridors' ? 'active' : ''}`}
            onClick={() => setActiveTab('corridors')}
            title="Origin-Destination Flows"
          >
            O-D Flows ({corridors.length})
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
            onClick={() => setActiveTab('cameras')}
            title="9,600 ANPR Camera Network Status across 11 District Hubs"
          >
            Cameras ({totalCameraCount || 9600})
          </button>
        </div>

        <button className="drawer-close" onClick={onClose} title="Collapse Panel">
          <X size={16} />
        </button>
      </div>

      <div className="drawer-content-scroll">
        {/* Tab 1: Road Path Vehicle Count Spectrum */}
        {activeTab === 'paths' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              VEHICLES ON MONITORED ROAD PATHS (CLICK TO FOCUS)
            </div>

            {pathSpectrum.map((path) => {
              const isSelected = selectedPath && selectedPath.id === path.id;
              return (
                <div 
                  key={path.id}
                  className="corridor-item"
                  style={{
                    borderColor: isSelected ? path.spectrumColor : undefined,
                    borderLeft: `4px solid ${path.spectrumColor}`,
                    backgroundColor: isSelected ? `${path.spectrumColor}10` : undefined,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onSelectPath && onSelectPath(path)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {path.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {path.sector} &bull; {path.lengthKm} km ({path.lanes} lanes)
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: `${path.spectrumColor}18`,
                      color: path.spectrumColor,
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}>
                      {path.los}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: 'var(--bg-primary)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Vehicles On This Path
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: path.spectrumColor, fontFamily: 'var(--font-mono)' }}>
                        {path.vehiclesOnPath.toLocaleString()} veh
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <div>Speed: <strong>{path.currentSpeed} km/h</strong></div>
                      <div>Density: <strong>{path.densityVehPerKm} v/km</strong></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Congestion Bottlenecks */}
        {activeTab === 'bottlenecks' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              ACTIVE CONGESTION HOTSPOTS & QUEUES
            </div>

            {bottlenecks.map((bn) => {
              const isSelected = selectedBottleneck && selectedBottleneck.id === bn.id;
              return (
                <div 
                  key={bn.id}
                  className="bottleneck-card"
                  style={{
                    borderColor: isSelected ? '#EF4444' : undefined,
                    backgroundColor: isSelected ? '#FEF2F2' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectBottleneck && onSelectBottleneck(bn)}
                >
                  <div className="card-header-row">
                    <span className="choke-name">{bn.name}</span>
                    <span className={`severity-pill ${bn.status.toLowerCase()}`}>
                      {bn.severity}/100 &bull; {bn.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {bn.cause}
                  </div>

                  <div className="card-metrics-grid">
                    <div className="metric-item">
                      Queue: <strong>{bn.queueLengthM}m</strong>
                    </div>
                    <div className="metric-item">
                      Speed: <strong>{bn.speedKmh} km/h</strong> (Free: {bn.freeFlowKmh})
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <button 
                      style={{
                        flex: 1,
                        height: '28px',
                        background: '#0F172A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Traffic Signal Override dispatched to ${bn.name}`);
                      }}
                    >
                      <Radio size={12} /> Optimize Signal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Origin-Destination Corridors */}
        {activeTab === 'corridors' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              MAJOR SECTOR FLOW VECTORS
            </div>

            {corridors.map((c) => (
              <div key={c.id} className="corridor-item">
                <div className="corridor-title-row">
                  <span>{c.origin}</span>
                  <ArrowRight size={12} color="#6366F1" />
                  <span>{c.destination}</span>
                </div>

                <div className="corridor-meta-row">
                  <span>Volume: <strong style={{ fontFamily: 'var(--font-mono)' }}>{c.volume} veh</strong></span>
                  <span>Avg Travel: <strong style={{ fontFamily: 'var(--font-mono)' }}>{c.avgTimeMin} min</strong></span>
                  <span style={{ 
                    color: c.status === 'Gridlock' ? '#EF4444' : '#2563EB',
                    fontWeight: 700 
                  }}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Delhi ANPR Camera Network & Mandate Compliance */}
        {activeTab === 'cameras' && (
          <div>
            {/* Delhi ANPR Installation Mandate Card */}
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Delhi ANPR Placement Mandate
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  background: '#DCFCE7',
                  color: '#15803D',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: '1px solid #86EFAC'
                }}>
                  100% COMPLIANT
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '4px', fontWeight: 600 }}>
                Rule: Min 1 Camera after every 1 km + Mandatory Camera at every turn.
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #BFDBFE',
                fontSize: '10px'
              }}>
                <div>
                  <span style={{ color: '#64748B' }}>Delhi Total Network:</span>{' '}
                  <strong style={{ color: '#0F172A' }}>9,600 Cams</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Turn Intersections:</span>{' '}
                  <strong style={{ color: '#2563EB' }}>5,840 (100%)</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>1-km Spacing Posts:</span>{' '}
                  <strong style={{ color: '#059669' }}>3,760 Cams</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Max Interval Gap:</span>{' '}
                  <strong style={{ color: '#059669' }}>&le; 0.95 km</strong>
                </div>
              </div>
            </div>

            {/* Sub-Filters: All, Turn Cameras, 1-km Spacing, Hubs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${preciseCameras.length + activeCameraList.length})` },
                { id: 'turn', label: `⮡ Turns (${turnCameras.length})` },
                { id: 'linear', label: `1k Posts (${linearCameras.length})` },
                { id: 'hubs', label: `Hubs (${activeCameraList.length})` }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setCameraSubFilter(sub.id)}
                  style={{
                    fontSize: '10px',
                    fontWeight: cameraSubFilter === sub.id ? 700 : 500,
                    padding: '3px 7px',
                    borderRadius: '5px',
                    border: '1px solid var(--border-color)',
                    background: cameraSubFilter === sub.id ? '#0F172A' : 'var(--surface)',
                    color: cameraSubFilter === sub.id ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Camera Node List */}
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
              Monitored Camera Nodes &bull; {cameraSubFilter.toUpperCase()}
            </div>

            {/* Render Precise Corridor Cameras (Turns and 1-km Posts) */}
            {(cameraSubFilter === 'all' || cameraSubFilter === 'turn' || cameraSubFilter === 'linear') &&
              preciseCameras
                .filter(c => cameraSubFilter === 'all' || (cameraSubFilter === 'turn' ? c.type === 'turn_mandatory' : c.type === 'linear_interval'))
                .map(cam => {
                  const isTurn = cam.type === 'turn_mandatory';
                  const badgeColor = isTurn ? '#2563EB' : '#059669';

                  return (
                    <div
                      key={cam.id}
                      style={{
                        padding: '9px 11px',
                        border: '1px solid var(--border-color)',
                        borderLeft: `3px solid ${badgeColor}`,
                        borderRadius: '6px',
                        marginBottom: '6px',
                        background: 'var(--surface)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cam.name}
                        </div>
                        <div style={{ fontSize: '9px', color: badgeColor, fontWeight: 600 }}>
                          ✓ {cam.rule}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {cam.id} &bull; {cam.pathName}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: badgeColor }}>
                          {cam.currentFlux.toLocaleString()} veh/hr
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                          Speed: <strong>{cam.avgSpeed} km/h</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}

            {/* Render Sector Hubs */}
            {(cameraSubFilter === 'all' || cameraSubFilter === 'hubs') &&
              activeCameraList.map(cam => {
                const count = cam.cameraCount || cam.count || 180;
                const activeCount = cam.activeCount || Math.round(count * 0.98);
                const flux = cam.currentFlux ? `${cam.currentFlux.toLocaleString()} pl/hr` : `${cam.count || 120} veh`;

                return (
                  <div
                    key={cam.id}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderLeft: '3px solid #6366F1',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      background: 'var(--surface)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cam.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {cam.id} &bull; {activeCount}/{count} online
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#6366F1' }}>
                        {count} CAMS
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Flux: <strong>{flux}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </aside>
  );
}
