import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SubFilterBar from './components/SubFilterBar';
import MapView from './components/MapView';
import TimelineScrubber from './components/TimelineScrubber';
import UserGuideModal from './components/UserGuideModal';
import { TrafficApi } from './services/api';
import { LOCATIONS, TIME_SLICES } from './services/trafficData';

export default function App() {
  // Query States — Default to All Delhi NCT Citywide Panoramic (22.0 km radius)
  const [selectedLocationKey, setSelectedLocationKey] = useState('all_delhi');
  const [radiusKm, setRadiusKm] = useState(22.0);
  const [timeStepIndex, setTimeStepIndex] = useState(15); // Default to 09:15 AM (rush hour peak)

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // Active Data Slice
  const [trafficData, setTrafficData] = useState(null);

  // Essential Core Map Layer Toggles: Heatmap, Road Corridors, Cameras
  const [showContinuousHeat, setShowContinuousHeat] = useState(true);
  const [showPathSpectrum, setShowPathSpectrum] = useState(true);
  const [showCameras, setShowCameras] = useState(true);

  // Interactive Guide Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Interactive selections on map
  const [selectedBottleneck, setSelectedBottleneck] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);

  // Load Data on query changes
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const data = await TrafficApi.getTrafficDensity({
        locationKey: selectedLocationKey,
        radiusKm: radiusKm,
        timeIndex: timeStepIndex
      });

      if (isMounted) {
        setTrafficData(data);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedLocationKey, radiusKm, timeStepIndex]);

  // Animation Playback Timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 1200 / speedMultiplier;
    const timer = setInterval(() => {
      setTimeStepIndex((prev) => {
        if (prev < TIME_SLICES.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier]);

  const activeLoc = LOCATIONS[selectedLocationKey] || LOCATIONS.all_delhi;
  const currentSlice = TIME_SLICES[timeStepIndex] || TIME_SLICES[0];

  const handleLocationSelect = (locKey) => {
    setSelectedLocationKey(locKey);
    const loc = LOCATIONS[locKey];
    if (loc && loc.defaultRadius) {
      setRadiusKm(loc.defaultRadius);
    }
  };

  const handleBottleneckSelect = (bn) => {
    setSelectedBottleneck(bn);
    setSelectedPath(null);
  };

  const handlePathSelect = (path) => {
    setSelectedPath(path);
    setSelectedBottleneck(null);
  };

  // Currently congested corridors (Orange & Red: Heavy & Critical)
  const activePathSpectrum = trafficData?.path_spectrum || [];
  const congestedCorridorCount = activePathSpectrum.filter(
    (p) => p.isCongested || p.spectrumClass === 'critical' || p.spectrumClass === 'heavy'
  ).length;

  return (
    <div className="app-shell">
      {/* Streamlined Top Header */}
      <Header
        currentTimeLabel={currentSlice.timeLabel}
        showContinuousHeat={showContinuousHeat}
        setShowContinuousHeat={setShowContinuousHeat}
        showPathSpectrum={showPathSpectrum}
        setShowPathSpectrum={setShowPathSpectrum}
        showCameras={showCameras}
        setShowCameras={setShowCameras}
        congestedCorridorCount={congestedCorridorCount}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Streamlined Sub-Filter Bar: Location & Core KPIs */}
      <SubFilterBar
        selectedLocationKey={selectedLocationKey}
        onLocationChange={handleLocationSelect}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        summary={trafficData?.summary}
      />

      {/* Edge-to-Edge Full Width GIS Map (No Sidebars) */}
      <div className="workspace-wrapper full-map-workspace">
        <MapView
          centerCoords={activeLoc.coords}
          radiusKm={radiusKm}
          continuousHeat={trafficData?.continuous_heat || []}
          vehicleDetections={trafficData?.vehicle_detections || []}
          pathSpectrum={trafficData?.path_spectrum || []}
          bottlenecks={trafficData?.bottlenecks || []}
          corridors={trafficData?.corridors || []}
          cameraClusters={trafficData?.camera_clusters || []}
          preciseCameras={trafficData?.precise_cameras || []}
          cameraDeploymentStats={trafficData?.camera_deployment_stats}
          summary={trafficData?.summary}
          showContinuousHeat={showContinuousHeat}
          showPathSpectrum={showPathSpectrum}
          showBottlenecks={true}
          showCameras={showCameras}
          showDetections={false}
          selectedBottleneck={selectedBottleneck}
          onSelectBottleneck={handleBottleneckSelect}
          selectedPath={selectedPath}
          onSelectPath={handlePathSelect}
        />
      </div>

      {/* Clean, Streamlined Bottom Timeline Controller */}
      <TimelineScrubber
        currentStepIndex={timeStepIndex}
        onStepChange={setTimeStepIndex}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        speedMultiplier={speedMultiplier}
        onSpeedChange={setSpeedMultiplier}
      />

      {/* Controls Reference Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
