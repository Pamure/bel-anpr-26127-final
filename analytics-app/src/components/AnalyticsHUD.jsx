import React from 'react';

export default function AnalyticsHUD({ summary }) {
  if (!summary) return null;

  const isSevere = summary.congestion_index_pct > 70;
  const isModerate = summary.congestion_index_pct > 45;

  return (
    <div className="map-hud-overlay">
      <div className="hud-stat-card">
        <span className="hud-number">{summary.total_vehicles.toLocaleString()}</span>
        <span className="hud-label">Vehicles in Radius</span>
      </div>

      <div className="hud-stat-card">
        <span className={`hud-number ${summary.avg_speed_kmh < 20 ? 'red' : (summary.avg_speed_kmh < 35 ? 'amber' : 'green')}`}>
          {summary.avg_speed_kmh} <span style={{ fontSize: '11px', fontWeight: 500 }}>km/h</span>
        </span>
        <span className="hud-label">Mean Velocity</span>
      </div>

      <div className="hud-stat-card">
        <span className={`hud-number ${isSevere ? 'red' : (isModerate ? 'amber' : 'green')}`}>
          {summary.congestion_index_pct}%
        </span>
        <span className="hud-label">Congestion Index</span>
      </div>

      <div className="hud-stat-card">
        <span className={`hud-number ${summary.choke_count > 2 ? 'red' : 'amber'}`}>
          {summary.choke_count} <span style={{ fontSize: '11px', fontWeight: 500 }}>Chokes</span>
        </span>
        <span className="hud-label">Critical Bottlenecks</span>
      </div>
    </div>
  );
}
