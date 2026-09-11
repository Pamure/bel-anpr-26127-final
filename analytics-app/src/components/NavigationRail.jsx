import React from 'react';
import { Activity, AlertTriangle, GitFork, Video, Settings } from 'lucide-react';

export default function NavigationRail({ activeTab, onTabChange }) {
  return (
    <aside className="nav-rail">
      <button 
        className={`rail-action-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
        onClick={() => onTabChange('heatmap')}
        title="Vehicle Density Heatmap & Scatter"
      >
        <Activity size={18} />
      </button>

      <button 
        className={`rail-action-btn ${activeTab === 'bottlenecks' ? 'active' : ''}`}
        onClick={() => onTabChange('bottlenecks')}
        title="Congestion Bottleneck Detection"
      >
        <AlertTriangle size={18} />
      </button>

      <button 
        className={`rail-action-btn ${activeTab === 'corridors' ? 'active' : ''}`}
        onClick={() => onTabChange('corridors')}
        title="Origin-Destination (O-D) Movement Corridors"
      >
        <GitFork size={18} />
      </button>

      <button 
        className={`rail-action-btn ${activeTab === 'cameras' ? 'active' : ''}`}
        onClick={() => onTabChange('cameras')}
        title="ANPR Camera Grid Health"
      >
        <Video size={18} />
      </button>

      <div className="rail-divider"></div>

      <div className="rail-spacer"></div>

      <button className="rail-action-btn" title="Platform Settings">
        <Settings size={18} />
      </button>
    </aside>
  );
}
