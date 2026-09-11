import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Sliders, 
  Play, 
  Layers, 
  Route, 
  Flame, 
  AlertTriangle, 
  Video, 
  MapPin, 
  Compass, 
  Eye,
  CheckCircle2
} from 'lucide-react';

export default function UserGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '24px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                BEL Traffic Analytics &bull; Complete Controls Guide
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Quick interactive reference for all dashboard buttons, filters, layers, and telemetry
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          background: '#FFFFFF',
          gap: '20px'
        }}>
          {[
            { id: 'overview', label: 'Platform Overview' },
            { id: 'filters', label: '1. Filters & Radius' },
            { id: 'timeline', label: '2. 24-Hr Timeline Scrubber' },
            { id: 'layers', label: '3. Heatmap & Layer Toggles' },
            { id: 'drawer', label: '4. Inspector Drawer' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 4px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#2563EB' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content Scroll Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1D4ED8', marginBottom: '4px' }}>
                  City-Wide ANPR Urban Traffic Analytics Dashboard (24-Hour Cycle)
                </h3>
                <p style={{ margin: 0, color: '#1E40AF', fontSize: '13px' }}>
                  This dashboard processes multi-camera ANPR feeds across <strong>9,600 cameras</strong> in 11 administrative district hubs and <strong>342,000+ daily vehicle recordings</strong> to provide macro-level urban traffic intelligence, spatial heatmaps, exact road vehicle counts, and bottleneck detection across a <strong>full 1-day 24-hour cycle (00:00 &ndash; 23:59)</strong> spanning all of NCT Delhi.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Route size={16} color="#2563EB" /> Road Path Vehicle Spectrum
                  </div>
                  <div>See the exact live vehicle volume on every major corridor across Delhi (Inner Ring, Outer Ring, NH-48 Airport, NH-44 GTK, Vikas Marg, etc.) with green, cyan, amber, and crimson color codes.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={16} color="#F97316" /> Continuous Thermal Heatmap
                  </div>
                  <div>Smooth Gaussian density ribbons that visualize network congestion temperature and highlight choke corridors across North, South, East, West, Central, and Airport sectors.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#EF4444" /> Choke Point Bottlenecks
                  </div>
                  <div>Automated queue length, speed drop ratio, and Level of Service (LoS) grading for traffic signal intervention at Ashram, Dhaula Kuan, Mukarba, ITO, AIIMS, and Peera Garhi.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={16} color="#10B981" /> 9,600 ANPR Cameras
                  </div>
                  <div>11 District hubs monitoring camera stream health, detection flux rates, 1-km linear posts, and 100% mandatory turn cameras across all NCT Delhi corridors.</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Filters & Radius */}
          {activeTab === 'filters' && (
            <div>
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Location Dropdown Selector
                </h4>
                <p style={{ margin: '0 0 8px 0' }}>
                  Click the <strong>Location</strong> dropdown in the sub-header bar to instantly center the dashboard on any urban core:
                </p>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li><strong>Connaught Place, New Delhi</strong> (Central Business District & Radial Ring)</li>
                  <li><strong>Karol Bagh Commercial Hub</strong> (West Central Sector)</li>
                  <li><strong>ITO Transit Intersection</strong> (East Ring Gateway & Yamuna Inflow)</li>
                  <li><strong>India Gate Central Vista</strong> (Administrative Sector)</li>
                  <li><strong>AIIMS - Ring Road Corridor</strong> (South Arterial Ring)</li>
                </ul>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Radius Slider (1.0 km &ndash; 15.0 km)
                </h4>
                <p style={{ margin: 0 }}>
                  Drag the <strong>Radius slider</strong> to adjust the circular query boundary. The blue dashed circle on the map automatically expands or contracts, dynamically updating the total vehicle count, monitored cameras, and local bottlenecks in real time.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === 'timeline' && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Full 24-Hour Cycle Scrubber (00:00 &ndash; 23:59, 48 Half-Hour Steps)
              </h4>
              <p style={{ marginBottom: '14px' }}>
                The bottom scrubber lets you examine how urban traffic evolves across a complete 1-day recording (48 intervals of 30 minutes each):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    🌙 🌅 ☀️ 🏫 🌆 🌃
                  </span>
                  <div>
                    <strong>1-Click Period Presets:</strong> Instantly jump the dashboard to key diurnal milestones: Late Night (02:00 AM), Dawn Logistics (06:00 AM), Morning Gridlock (09:30 AM), Midday Lunch (01:30 PM), All-Day Peak (06:30 PM), or Night Taper (09:00 PM).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>▶</span>
                  <div>
                    <strong>Play / Pause Button:</strong> Starts automatic continuous playback. Watch morning rush corridors transition to midday lull and then flare up into critical evening peak congestion.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700 }}>1x 2x 4x 8x</span>
                  <div>
                    <strong>Speed Multipliers:</strong> Accelerate 24-hour playback up to 8&times; speed for quick high-level diurnal analysis.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', borderRadius: '6px', padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700 }}>Range Slider</span>
                  <div>
                    <strong>Manual 24-Hr Scrubbing:</strong> Drag the thumb to scrub through all 48 steps in real time.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Layers */}
          {activeTab === 'layers' && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                Header Layer Toggle Buttons
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: '2px' }}>
                    🛣️ Path Spectrum Button
                  </div>
                  <div>Toggles individual arterial roads with color-coded vehicle volume ribbons. Hover over any road to see: <em>"X,XXX vehicles on this path right now"</em>.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#F97316', marginBottom: '2px' }}>
                    🔥 Continuous Heat Button
                  </div>
                  <div>Toggles the smooth continuous Gaussian thermal heatmap overlay on the map.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '2px' }}>
                    ⚠️ Bottlenecks Button
                  </div>
                  <div>Toggles critical choke point markers with queue length, speed drop, and primary causes.</div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#10B981', marginBottom: '2px' }}>
                    📷 2,200 Cameras Button
                  </div>
                  <div>Toggles the 12 ANPR sector camera hubs showing camera counts and detection flux.</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Drawer */}
          {activeTab === 'drawer' && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Right Inspector Drawer Tabs
              </h4>
              <p style={{ marginBottom: '14px' }}>
                Click on the right drawer or click any item on the map to open detailed telemetry:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div><strong>Paths Tab:</strong> Ranked table of all roads by live vehicle volume. Click any corridor to immediately center and zoom the map onto that path.</div>
                <div><strong>Chokes Tab:</strong> Live congestion hotspots with queue lengths in meters, speed drop vs speed limit, and an <em>"Optimize Signal"</em> override action.</div>
                <div><strong>O-D Flows Tab:</strong> Origin-Destination desire lines showing trip volume between urban sectors.</div>
                <div><strong>Cameras Tab:</strong> Real-time status for all 2,200 ANPR camera nodes across the 12 sectors.</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#F8FAFC'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Got it, Let's Explore
          </button>
        </div>
      </div>
    </div>
  );
}
