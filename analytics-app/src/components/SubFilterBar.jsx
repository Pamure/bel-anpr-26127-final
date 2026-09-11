import React from 'react';
import { MapPin } from 'lucide-react';
import { LOCATIONS } from '../services/trafficData';

export default function SubFilterBar({
  selectedLocationKey,
  onLocationChange,
  summary
}) {
  return (
    <div className="sub-filter-bar">
      <div className="filter-left-controls">
        <div className="filter-group">
          <span className="filter-title">
            <MapPin size={13} color="#2563EB" />
            Sector / Region:
          </span>
          <select 
            className="select-control"
            value={selectedLocationKey}
            onChange={(e) => onLocationChange(e.target.value)}
            title="Focus on specific Delhi Sector or Full Panoramic View"
          >
            {Object.keys(LOCATIONS).map((key) => {
              const loc = LOCATIONS[key];
              return (
                <option key={key} value={key}>
                  {loc.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="kpi-pills-container">
        <div className="kpi-pill">
          <span className="dot-indicator blue"></span>
          <span>Fleet: <strong>{summary ? summary.total_vehicles.toLocaleString() : '21,660'} veh</strong></span>
        </div>

        <div className="kpi-pill">
          <span className="dot-indicator amber"></span>
          <span>Speed: <strong>{summary ? `${summary.avg_speed_kmh} km/h` : '34 km/h'}</strong></span>
        </div>

        <div className="kpi-pill">
          <span className="dot-indicator red"></span>
          <span>Congestion: <strong>{summary ? `${summary.congestion_index_pct}%` : '58%'}</strong></span>
        </div>
      </div>
    </div>
  );
}
