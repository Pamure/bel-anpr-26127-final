import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import MapLegend from './MapLegend';
import { Plus, Minus, Crosshair, Navigation, Video, X } from 'lucide-react';

export default function MapView({
  centerCoords = [28.6139, 77.2090],
  radiusKm = 22.0,
  continuousHeat = [],
  vehicleDetections = [],
  pathSpectrum = [],
  cameraClusters = [],
  preciseCameras = [],
  bottlenecks = [],
  corridors = [],
  summary,
  showContinuousHeat = true,
  showPathSpectrum = true,
  showBottlenecks = true,
  showCameras = true,
  showDetections = true,
  selectedBottleneck,
  onSelectBottleneck,
  selectedPath,
  onSelectPath
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Layer groups refs
  const radiusLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const pathSpectrumLayerRef = useRef(null);
  const bottleneckLayerRef = useRef(null);
  const corridorLayerRef = useRef(null);
  const cameraClusterLayerRef = useRef(null);
  const preciseCameraLayerRef = useRef(null);
  const detectionLayerRef = useRef(null);

  // Interactive state
  const [hoveredPath, setHoveredPath] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(11);

  // Initialize Map strictly in Light Theme with citywide Delhi panorama (zoom 11)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialZoom = radiusKm >= 15 ? 11 : 13;
      const map = L.map(mapContainerRef.current, {
        center: centerCoords,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false
      });

      // Clean Light Tile Provider (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Initialize layer groups in proper visual stacking order
      heatLayerRef.current = null; // initialized dynamically
      pathSpectrumLayerRef.current = L.layerGroup().addTo(map);
      corridorLayerRef.current = L.layerGroup().addTo(map);
      detectionLayerRef.current = L.layerGroup().addTo(map);
      cameraClusterLayerRef.current = L.layerGroup().addTo(map);
      preciseCameraLayerRef.current = L.layerGroup().addTo(map);
      bottleneckLayerRef.current = L.layerGroup().addTo(map);

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      const handleWinResize = () => map.invalidateSize();
      window.addEventListener('resize', handleWinResize);

      mapInstanceRef.current = map;

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleWinResize);
      };
    }
  }, []);

  // Update Center & Dynamic Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetZoom = radiusKm >= 15 ? 11 : (radiusKm >= 8 ? 12.5 : 14);
    map.flyTo(centerCoords, targetZoom, { duration: 0.9 });

    if (radiusLayerRef.current) {
      map.removeLayer(radiusLayerRef.current);
    }

    radiusLayerRef.current = L.circle(centerCoords, {
      radius: radiusKm * 1000,
      color: '#2563EB',
      weight: 1.8,
      dashArray: '5, 6',
      fillColor: '#3B82F6',
      fillOpacity: 0.04
    }).addTo(map);
  }, [centerCoords, radiusKm]);

  // Pan to selected bottleneck
  useEffect(() => {
    if (selectedBottleneck && selectedBottleneck.coords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(selectedBottleneck.coords, 15, { duration: 0.9 });
    }
  }, [selectedBottleneck]);

  // Pan to selected path
  useEffect(() => {
    if (selectedPath && selectedPath.coords && mapInstanceRef.current) {
      const midCoord = selectedPath.coords[Math.floor(selectedPath.coords.length / 2)];
      mapInstanceRef.current.flyTo(midCoord, 13, { duration: 0.9 });
    }
  }, [selectedPath]);

  // Render Continuous Gaussian Heatmap across all of Delhi (Optimized for 1x, 2x, 3x, 4x Playback)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showContinuousHeat || !continuousHeat || continuousHeat.length === 0) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    if (typeof L.heatLayer === 'function') {
      if (heatLayerRef.current) {
        // Fast in-place update without tearing down and recreating the canvas!
        heatLayerRef.current.setLatLngs(continuousHeat);
        heatLayerRef.current.redraw();
      } else {
        // Initial layer creation
        try {
          heatLayerRef.current = L.heatLayer(continuousHeat, {
            radius: 34,
            blur: 22,
            maxZoom: 16,
            max: 0.95,
            minOpacity: 0.30,
            gradient: {
              0.15: 'rgba(16, 185, 129, 0.45)', // Emerald green (Free flow)
              0.38: 'rgba(2, 132, 199, 0.65)',  // Cyan / Azure (Normal)
              0.60: 'rgba(245, 158, 11, 0.80)', // Golden Amber (Moderate)
              0.80: 'rgba(234, 88, 12, 0.92)',  // Vivid Orange (Heavy)
              1.00: 'rgba(220, 38, 38, 1.0)'    // Crimson Red Core (Gridlock)
            }
          }).addTo(map);
        } catch (err) {
          console.warn('Continuous heatLayer error:', err);
        }
      }
    }
  }, [continuousHeat, showContinuousHeat]);

  // Render Road Path Traffic Spectrum Layer across all 12 Delhi Corridors
  // Render Road Path Traffic Spectrum Layer across all 12 Delhi Corridors
  // Dynamic Congestion Opacity & High-Intensity Alert Colors:
  // - When congestion is too low -> opacity is very low (0.07 - 0.14) so map remains clear and uncluttered
  // - As congestion increases -> opacity scales up to 0.95 - 1.0 and colors transform intensely (Amber -> Orange -> Crimson Red)
  useEffect(() => {
    const layer = pathSpectrumLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (showPathSpectrum && pathSpectrum.length > 0) {
      pathSpectrum.forEach(path => {
        const isSelected = selectedPath && selectedPath.id === path.id;
        const isCritical = path.spectrumClass === 'critical';
        const lineOpacity = isSelected ? 1.0 : (path.opacity ?? (path.isCongested ? 0.95 : 0.10));
        const hasCasing = path.hasBoundary || isSelected || lineOpacity >= 0.38;

        // Path Outer Boundary for clean light contrast against thermal heatmap
        // Only drawn when corridor has sufficient presence to avoid white line clutter at low congestion
        if (hasCasing) {
          const boundary = L.polyline(path.coords, {
            color: '#FFFFFF',
            weight: (path.weight || 5) + 3.5,
            opacity: Math.min(0.92, lineOpacity * 0.92),
            lineCap: 'round',
            lineJoin: 'round'
          });
          layer.addLayer(boundary);
        }

        // Core Spectrum Polyline (Color & Opacity dynamically driven by congestion)
        const line = L.polyline(path.coords, {
          color: path.spectrumColor,
          weight: isSelected ? (path.weight || 5) + 3.5 : (path.weight || 4),
          opacity: lineOpacity,
          dashArray: isCritical ? '12, 6' : undefined,
          lineCap: 'round',
          lineJoin: 'round'
        });

        line.on('mouseover', () => {
          setHoveredPath(path);
          line.setStyle({ 
            weight: (path.weight || 5) + 3,
            opacity: Math.max(0.85, lineOpacity)
          });
        });

        line.on('mouseout', () => {
          setHoveredPath(null);
          if (!isSelected) {
            line.setStyle({ 
              weight: path.weight || 4,
              opacity: lineOpacity
            });
          }
        });

        line.on('click', () => {
          if (onSelectPath) onSelectPath(path);
        });

        line.bindTooltip(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:220px; padding:3px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
              <span style="font-weight:700; font-size:12px; color:#0F172A;">${path.name}</span>
              <span style="font-size:9px; font-weight:800; text-transform:uppercase; background:${path.spectrumColor}1A; color:${path.spectrumColor}; padding:2px 6px; border-radius:4px; border:1px solid ${path.spectrumColor}40;">
                ${path.spectrumClass === 'critical' ? 'CRITICAL GRIDLOCK' : (path.spectrumClass === 'heavy' ? 'HEAVY CONGESTION' : (path.spectrumClass === 'moderate' ? 'MODERATE FLOW' : 'FREE FLOW'))}
              </span>
            </div>
            <div style="font-size:10px; color:#64748B; margin-bottom:6px;">${path.sector} &bull; ${path.lengthKm} km (${path.lanes} lanes)</div>
            
            <div style="background:${path.spectrumColor}14; border-left:3px solid ${path.spectrumColor}; border-radius:4px; padding:6px 8px; margin-bottom:6px;">
              <div style="font-size:13px; font-weight:800; color:${path.spectrumColor};">
                ${path.vehiclesOnPath.toLocaleString()} vehicles on this corridor
              </div>
              <div style="font-size:10px; color:${path.spectrumColor}; font-weight:600;">
                ${path.los} &bull; ${path.saturationPct}% Capacity Saturation
              </div>
            </div>

            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px; color:#334155;">
              <span>Space Mean Speed:</span> <strong>${path.currentSpeed} km/h</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; color:#334155;">
              <span>Linear Density:</span> <strong>${path.densityVehPerKm} veh/km</strong>
            </div>
            <div style="font-size:10px; color:#64748B; margin-top:4px; border-top:1px dashed #E2E8F0; padding-top:3px; display:flex; justify-content:space-between;">
              <span>Render Opacity:</span> <strong>${Math.round(lineOpacity * 100)}%</strong>
            </div>
          </div>
        `, { sticky: true, className: 'leaflet-tooltip-spectrum' });

        layer.addLayer(line);
      });
    }
  }, [pathSpectrum, showPathSpectrum, selectedPath, onSelectPath]);

  // Render 11 District Camera Sector Hubs (Sum = 9,600 Cameras Spanning All 11 Districts)
  useEffect(() => {
    const layer = cameraClusterLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (showCameras && cameraClusters.length > 0) {
      cameraClusters.forEach((hub) => {
        const isAlert = hub.status === "Alert";
        const iconHtml = `
          <div style="
            background: #FFFFFF;
            border: 2px solid ${isAlert ? '#EF4444' : '#2563EB'};
            border-radius: 20px;
            padding: 3px 9px;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.14);
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            font-weight: 700;
            color: ${isAlert ? '#EF4444' : '#1E40AF'};
            white-space: nowrap;
            cursor: pointer;
            transition: transform 0.15s ease;
          ">
            <span style="font-size: 11px;">📷</span>
            <span>${hub.cameraCount.toLocaleString()} CAMS</span>
          </div>
        `;

        const marker = L.marker(hub.coords, {
          icon: L.divIcon({
            html: iconHtml,
            className: 'camera-hub-marker',
            iconSize: [95, 26],
            iconAnchor: [47, 13]
          })
        });

        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px;">
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#2563EB; margin-bottom:2px;">
              ${hub.district || 'NCT Delhi District'}
            </div>
            <div style="font-weight:700; font-size:13px; color:#0F172A; margin-bottom:6px;">${hub.name}</div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>District Cameras:</span> <strong>${hub.cameraCount.toLocaleString()} ANPR Nodes</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Operational:</span> <strong style="color:#10B981;">${hub.activeCount.toLocaleString()} Active</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Plate Sighting Flux:</span> <strong>${hub.currentFlux.toLocaleString()} plates/hr</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between;">
              <span>District Speed:</span> <strong>${hub.avgSpeed} km/h</strong>
            </div>
          </div>
        `);

        layer.addLayer(marker);
      });
    }
  }, [cameraClusters, showCameras]);

  // Render Mandatory Turn Cameras & 1-km Linear Spacing Cameras Along All 12 Delhi Corridors
  useEffect(() => {
    const layer = preciseCameraLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (showCameras && preciseCameras.length > 0) {
      const isZoomedIn = currentZoom >= 13;

      preciseCameras.forEach((cam) => {
        const isTurn = cam.type === "turn_mandatory";
        const isEndpoint = cam.type === "corridor_terminal";
        const badgeColor = isTurn ? "#2563EB" : (isEndpoint ? "#7C3AED" : "#059669");
        const badgeSymbol = isTurn ? "⮡" : (isEndpoint ? "⚑" : "1k");

        // When zoomed out (<13), use elegant compact micro-dots to avoid screen clutter.
        // When zoomed in (>=13), render interactive badges with symbols!
        const iconHtml = isZoomedIn ? `
          <div style="
            background: #FFFFFF;
            border: 2px solid ${badgeColor};
            border-radius: ${isTurn ? '50%' : '6px'};
            width: ${isTurn ? '20px' : '22px'};
            height: ${isTurn ? '20px' : '18px'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 800;
            color: ${badgeColor};
            cursor: pointer;
            transition: transform 0.15s ease;
          " title="${cam.name}">
            ${badgeSymbol}
          </div>
        ` : `
          <div style="
            background: ${badgeColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            width: 10px;
            height: 10px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            cursor: pointer;
          " title="${cam.name}"></div>
        `;

        const size = isZoomedIn ? [22, 20] : [10, 10];
        const anchor = isZoomedIn ? [11, 10] : [5, 5];

        const marker = L.marker(cam.coords, {
          icon: L.divIcon({
            html: iconHtml,
            className: 'precise-camera-marker',
            iconSize: size,
            iconAnchor: anchor
          })
        });

        marker.bindTooltip(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:11px;">
            <div style="font-weight:700; color:${badgeColor};">${cam.name}</div>
            <div style="font-size:10px; color:#64748B;">${cam.rule}</div>
            <div style="font-size:10px; margin-top:2px;">Flux: <strong>${cam.currentFlux.toLocaleString()} veh/hr</strong> &bull; Speed: <strong>${cam.avgSpeed} km/h</strong></div>
          </div>
        `, { sticky: true, className: 'leaflet-tooltip-spectrum' });

        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:210px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:10px; font-weight:700; background:${badgeColor}18; color:${badgeColor}; padding:1px 6px; border-radius:4px;">
                ${cam.typeLabel}
              </span>
              <span style="font-size:10px; font-family:'JetBrains Mono',monospace; color:#64748B;">
                ${cam.id}
              </span>
            </div>
            <div style="font-weight:700; font-size:13px; color:#0F172A; margin-bottom:6px;">${cam.name}</div>
            <div style="font-size:11px; padding:6px; background:#F8FAFC; border-radius:6px; margin-bottom:6px; border:1px solid #E2E8F0;">
              <div style="color:#1E293B; font-weight:600; margin-bottom:2px;">Mandate Verification:</div>
              <div style="color:#059669; font-size:10px; font-weight:700;">✓ PASS &bull; ${cam.rule}</div>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Corridor:</span> <strong>${cam.pathName}</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Hourly Flux:</span> <strong>${cam.currentFlux.toLocaleString()} veh/hr</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Current Speed:</span> <strong>${cam.avgSpeed} km/h</strong> (Limit: ${cam.speedLimit})
            </div>
          </div>
        `);

        layer.addLayer(marker);
      });
    }
  }, [preciseCameras, showCameras, currentZoom]);

  // Render Live Vehicle Detections Distributed Across Delhi Corridors
  useEffect(() => {
    const layer = detectionLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (showDetections && vehicleDetections.length > 0) {
      vehicleDetections.forEach((det) => {
        const marker = L.circleMarker([det.lat, det.lng], {
          radius: 4,
          color: '#FFFFFF',
          weight: 1.2,
          fillColor: '#2563EB',
          fillOpacity: 0.85
        });

        marker.bindTooltip(`
          <div style="font-family:'JetBrains Mono',monospace; font-size:10px; padding:2px;">
            <div style="font-weight:700; color:#2563EB;">${det.plate}</div>
            <div style="color:#64748B; font-family:'Plus Jakarta Sans',sans-serif;">${det.vehicleClass} &bull; ${det.speedKmh} km/h</div>
            <div style="font-size:9px; color:#94A3B8;">${det.corridor}</div>
          </div>
        `, { sticky: true });

        layer.addLayer(marker);
      });
    }
  }, [vehicleDetections, showDetections]);

  // Update Delhi-Wide Bottlenecks (Ashram, Dhaula Kuan, Mukarba, ITO, etc.)
  useEffect(() => {
    const layer = bottleneckLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (showBottlenecks && bottlenecks.length > 0) {
      bottlenecks.forEach(bn => {
        const iconHtml = `
          <div style="
            background: #EF4444;
            color: white;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
            border: 2px solid white;
            cursor: pointer;
            transition: transform 0.15s ease;
          ">
            <span style="font-size: 11px; font-weight: 800;">!</span>
          </div>
        `;

        const marker = L.marker(bn.coords, {
          icon: L.divIcon({
            html: iconHtml,
            className: 'bn-marker-icon',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });

        marker.on('click', () => {
          if (onSelectBottleneck) onSelectBottleneck(bn);
        });

        marker.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:190px;">
            <div style="font-size:10px; font-weight:700; color:#EF4444; text-transform:uppercase; margin-bottom:2px;">
              ${bn.zone || 'Delhi Choke Point'}
            </div>
            <div style="font-weight:700; color:#B91C1C; font-size:13px; margin-bottom:4px;">${bn.name}</div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Severity:</span> <strong style="color:#EF4444;">${bn.severity}/100 (${bn.status})</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>Queue Length:</span> <strong>${bn.queueLengthM}m</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Current Speed:</span> <strong>${bn.speedKmh} km/h (Limit: ${bn.freeFlowKmh})</strong>
            </div>
            <div style="font-size:10px; color:#64748B; border-top:1px solid #E2E8F0; padding-top:4px;">
              <em>Cause: ${bn.cause}</em>
            </div>
          </div>
        `);

        layer.addLayer(marker);
      });
    }
  }, [bottlenecks, showBottlenecks, onSelectBottleneck]);

  // Update Origin-Destination Corridors across Delhi
  useEffect(() => {
    const layer = corridorLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (corridors.length > 0) {
      corridors.forEach(c => {
        const line = L.polyline([c.originCoords, c.destCoords], {
          color: '#6366F1',
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.65
        });

        line.bindTooltip(`
          <div style="font-size:11px; font-family:'Plus Jakarta Sans',sans-serif;">
            <strong>${c.origin} &rarr; ${c.destination}</strong><br>
            Volume: ${c.volume.toLocaleString()} veh &bull; Travel Time: ${c.avgTimeMin} min
          </div>
        `);

        layer.addLayer(line);
      });
    }
  }, [corridors]);

  // Floating map zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    const targetZoom = radiusKm >= 15 ? 11 : (radiusKm >= 8 ? 12.5 : 14);
    mapInstanceRef.current?.setView(centerCoords, targetZoom);
  };

  const activePathDisplay = hoveredPath || selectedPath;

  return (
    <main className="map-canvas-container">
      {/* Floating Legend */}
      <MapLegend />

      {/* Floating Path Vehicle Inspector Banner in Clean Light Theme */}
      {activePathDisplay && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: 'var(--shadow-floating)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          minWidth: '420px',
          borderLeft: `5px solid ${activePathDisplay.spectrumColor}`,
          color: '#0F172A'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={14} color={activePathDisplay.spectrumColor} />
              {activePathDisplay.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              {activePathDisplay.sector} &bull; {activePathDisplay.lengthKm} km ({activePathDisplay.lanes} lanes)
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '14px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: activePathDisplay.spectrumColor, fontFamily: 'var(--font-mono)' }}>
              {activePathDisplay.vehiclesOnPath.toLocaleString()} vehicles
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
              Live Count
            </div>
          </div>

          <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '14px', fontSize: '11px' }}>
            <div>Speed: <strong>{activePathDisplay.currentSpeed} km/h</strong></div>
            <div>Density: <strong>{activePathDisplay.densityVehPerKm} v/km</strong></div>
          </div>

          <div style={{
            background: `${activePathDisplay.spectrumColor}18`,
            color: activePathDisplay.spectrumColor,
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}>
            {activePathDisplay.los}
          </div>

          <button
            onClick={() => {
              setHoveredPath(null);
              if (onSelectPath) onSelectPath(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              marginLeft: 'auto',
              borderRadius: '4px'
            }}
            title="Dismiss details"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Floating Tools: Zoom & Recenter */}
      <div className="map-tool-buttons">
        <button className="tool-btn" onClick={handleZoomIn} title="Zoom In">
          <Plus size={16} />
        </button>
        <button className="tool-btn" onClick={handleZoomOut} title="Zoom Out">
          <Minus size={16} />
        </button>
        <button className="tool-btn" onClick={handleRecenter} title="Recenter on Location">
          <Crosshair size={16} />
        </button>
      </div>

      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} className="leaflet-map-element" />
    </main>
  );
}
