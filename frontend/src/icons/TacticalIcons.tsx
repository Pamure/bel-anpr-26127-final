import React from 'react'

/**
 * Tactical Command Center SVG Icon Suite
 * Hand-crafted inline SVGs with consistent 24x24 viewBox, stroke-based design.
 * Color inherits via currentColor; size via width/height props.
 */

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function RadarSweepIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <circle cx="12" cy="12" r="9" opacity="0.4" />
      <circle cx="12" cy="12" r="6" opacity="0.6" />
      <circle cx="12" cy="12" r="3" opacity="0.8" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      <path d="M12 12 L19 7" opacity="0.9" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CameraNodeIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
      <path d="M4 8h1M4 20h16" opacity="0.5" />
    </svg>
  )
}

export function TrajectoryRouteIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <circle cx="5" cy="5" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M7.5 5 H14 A5 5 0 0 1 14 15 H7" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2l2 3h-4z" transform="translate(0,0)" opacity="0" />
    </svg>
  )
}

export function HSRPPlateIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect x="4" y="7" width="4" height="10" fill="currentColor" stroke="none" opacity="0.3" />
      <circle cx="6" cy="12" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
      <path d="M9.5 11.5h8M9.5 14h5.5M17 9.5v5" opacity="0.8" />
    </svg>
  )
}

export function BlacklistShieldIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
      <path d="M12 8v5M12 16.5v0.5" strokeWidth="2.5" />
    </svg>
  )
}

export function SpeedGaugeIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M12 21a9 9 0 1 1 9-9" />
      <path d="M12 12l5-4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 3v2M3 12h2M19 12h2" opacity="0.4" />
    </svg>
  )
}

export function HeatmapGridIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" opacity="0.5" />
      <rect x="3" y="13" width="8" height="8" rx="1" opacity="0.5" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <circle cx="7" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="17" r="3" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="7" cy="17" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  )
}

export function NavigationArrowIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M2 12l20-10-8 20-2.5-7.5L4 12z" />
    </svg>
  )
}

export function OriginDestIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <circle cx="5" cy="19" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="5" r="2.5" />
      <path d="M7.5 19H17a2 2 0 0 0 2-2V7.5" />
      <path d="M5 19C5 12 9 8 14 6.5" opacity="0.4" />
    </svg>
  )
}

export function CongestionIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.7" />
      <circle cx="6" cy="6" r="3.5" opacity="0.35" />
      <circle cx="18" cy="18" r="4.5" opacity="0.45" />
      <circle cx="18" cy="6" r="2.5" opacity="0.25" />
      <circle cx="6" cy="18" r="3" opacity="0.3" />
    </svg>
  )
}

export function LiveFeedIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M2 5l4 4M22 5l-4 4M2 19l4-4M22 19l-4-4" opacity="0.4" />
      <path d="M8 2v3M16 2v3M8 19v3M16 19v3" opacity="0.3" />
    </svg>
  )
}

export function FingerprintIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M12 11c0 4-1.5 7-4 9" />
      <path d="M9 8.5A4 4 0 0 1 16 9c0 3-.8 5.5-2.5 7.5" />
      <path d="M5.5 14A8 8 0 0 1 20 12" opacity="0.7" />
      <path d="M3.5 9.5C6 6 9 4.5 12 4.5c1.8 0 3.5.5 5 1.5" opacity="0.5" />
    </svg>
  )
}

export function DatabaseNodeIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      <circle cx="17" cy="19" r="2" fill="currentColor" stroke="none" opacity="0.6" />
    </svg>
  )
}

export function AlertPulseIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="M4.5 4.5l2.8 2.8M19.5 4.5l-2.8 2.8M4.5 19.5l2.8-2.8M19.5 19.5l-2.8-2.8" opacity="0.4" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 9.5v3M12 15h0.01" strokeWidth="2.5" />
    </svg>
  )
}

export function SearchVehicleIcon({ size = 24, className = '', style }) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style}>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M21 21l-5.2-5.2" />
      <rect x="6.5" y="8.5" width="8" height="5" rx="0.8" opacity="0.8" />
      <path d="M9.5 10.5h2.5" opacity="0.6" />
    </svg>
  )
}

/**
 * Icon registry for dynamic lookup
 */
export const TacticalIcons = {
  radar: RadarSweepIcon,
  camera: CameraNodeIcon,
  route: TrajectoryRouteIcon,
  plate: HSRPPlateIcon,
  shield: BlacklistShieldIcon,
  gauge: SpeedGaugeIcon,
  heatmap: HeatmapGridIcon,
  nav: NavigationArrowIcon,
  od: OriginDestIcon,
  congestion: CongestionIcon,
  live: LiveFeedIcon,
  fingerprint: FingerprintIcon,
  database: DatabaseNodeIcon,
  alert: AlertPulseIcon,
  search: SearchVehicleIcon,
}

export function TacticalIcon({ name, ...props }) {
  const Icon = TacticalIcons[name] || CameraNodeIcon
  return <Icon {...props} />
}

export default TacticalIcons