import React, { useEffect, useState } from 'react'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { MapPin, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, 
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

const CHART_COLORS = {
  primary: '#00E599',
  secondary: '#00B4D8',
  warning: '#FFB020',
  critical: '#FF334B',
  grid: '#222B3D',
  text: '#94A3B8',
  background: 'rgba(0, 229, 153, 0.1)',
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#0E131F',
      titleColor: '#F1F5F9',
      bodyColor: '#F1F5F9',
      borderColor: '#222B3D',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
    },
    y: {
      grid: { color: '#222B3D', drawBorder: false },
      ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
      beginAtZero: true,
    },
  },
  interaction: { mode: 'index', intersect: false },
}

const horizontalChartOptions = {
  ...chartOptions,
  indexAxis: 'y' as const,
  scales: {
    x: {
      grid: { color: '#222B3D', drawBorder: false },
      ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
      beginAtZero: true,
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#94A3B8',
        font: { family: 'JetBrains Mono', size: 10 },
        autoSkip: false,
      },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: '#0E131F',
      titleColor: '#F1F5F9',
      bodyColor: '#F1F5F9',
      borderColor: '#222B3D',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  cutout: '70%',
}

interface AnalyticsViewProps {}

export function AnalyticsView({}: AnalyticsViewProps) {
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [odData, setOdData] = useState<any[]>([])
  const [speedData, setSpeedData] = useState<any[]>([])
  const [densityData, setDensityData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeWindow, setTimeWindow] = useState(24)

  useEffect(() => {
    fetchAnalytics()
  }, [timeWindow])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const headers = { 'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'bel-anpr-2026-secret-key-change-in-production'}` }
      
      const [heatmapRes, odRes, speedRes, densityRes] = await Promise.all([
        fetch(`/api/analytics/heatmap?hours=${timeWindow}`, { headers }),
        fetch(`/api/analytics/od?hours=${timeWindow}`, { headers }),
        fetch(`/api/analytics/speed?hours=${timeWindow}`, { headers }),
        fetch(`/api/analytics/density?hours=${timeWindow}`, { headers }),
      ])

      if (heatmapRes.ok) setHeatmapData(await heatmapRes.json())
      if (odRes.ok) setOdData(await odRes.json())
      if (speedRes.ok) setSpeedData(await speedRes.json())
      if (densityRes.ok) setDensityData(await densityRes.json())
    } catch (e) {
      console.error('Failed to fetch analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  // Chart data preparation
  const densityChartData = {
    labels: densityData.slice(0, 24).map((d: any) => new Date(d.hour_bucket).getHours().toString().padStart(2, '0') + ':00'),
    datasets: [
      {
        label: 'Vehicles',
        data: densityData.slice(0, 24).map((d: any) => d.vehicle_count),
        backgroundColor: CHART_COLORS.background,
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Unique Plates',
        data: densityData.slice(0, 24).map((d: any) => d.unique_plates),
        backgroundColor: 'rgba(0, 180, 216, 0.1)',
        borderColor: CHART_COLORS.secondary,
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  }

  const odChartData = {
    labels: odData.slice(0, 10).map((d: any) => `${d.origin_label || d.origin_camera} → ${d.destination_label || d.destination_camera || d.dest_camera}`),
    datasets: [{
      label: 'Vehicle Flow',
      data: odData.slice(0, 10).map((d: any) => d.vehicle_count),
      backgroundColor: CHART_COLORS.background,
      borderColor: CHART_COLORS.primary,
      borderWidth: 2,
      borderRadius: 4,
    }],
  }

  const speedChartData = {
    labels: speedData.slice(0, 10).map((d: any) => `${d.camera_a} → ${d.camera_b}`),
    datasets: [{
      label: 'Avg Speed (km/h)',
      data: speedData.slice(0, 10).map((d: any) => d.avg_speed_kmh),
      backgroundColor: 'rgba(255, 176, 32, 0.1)',
      borderColor: CHART_COLORS.warning,
      borderWidth: 2,
      borderRadius: 4,
    }],
  }

  const vehicleTypeData = {
    labels: ['Cars', 'Bikes', 'Trucks', 'Buses', 'Unknown'],
    datasets: [{
      data: [65, 20, 10, 3, 2],
      backgroundColor: [
        CHART_COLORS.primary,
        CHART_COLORS.secondary,
        CHART_COLORS.warning,
        CHART_COLORS.critical,
        '#64748B',
      ],
      borderWidth: 0,
    }],
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-10 h-10 mx-auto text-[var(--accent-primary)] animate-spin" />
          <p className="mt-4 text-[var(--text-muted)]">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">MACRO TRAFFIC ANALYTICS</h2>
          <p className="text-sm text-[var(--text-secondary)]">Last {timeWindow} hours • Delhi NCR</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeWindow}
            onChange={e => setTimeWindow(Number(e.target.value))}
            className="input text-xs py-1.5 w-auto"
          >
            <option value={1}>1 Hour</option>
            <option value={6}>6 Hours</option>
            <option value={12}>12 Hours</option>
            <option value={24}>24 Hours</option>
            <option value={48}>48 Hours</option>
            <option value={168}>1 Week</option>
          </select>
          <button onClick={fetchAnalytics} className="btn btn-ghost btn-icon p-2" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard 
          label="TOTAL VEHICLES" 
          value={densityData.reduce((s: number, d: any) => s + d.vehicle_count, 0).toLocaleString()} 
          icon={Activity} 
          color={CHART_COLORS.primary}
          trend="+12%"
          trendUp={true}
        />
        <KPICard 
          label="UNIQUE PLATES" 
          value={densityData.reduce((s: number, d: any) => s + d.unique_plates, 0).toLocaleString()} 
          icon={MapPin} 
          color={CHART_COLORS.secondary}
          trend="+8%"
          trendUp={true}
        />
        <KPICard 
          label="ACTIVE CAMERAS" 
          value={new Set(densityData.map((d: any) => d.camera_id)).size} 
          icon={TrendingUp} 
          color={CHART_COLORS.warning}
          trend="0%"
          trendUp={true}
        />
        <KPICard 
          label="AVG SPEED" 
          value={speedData.length > 0 ? Math.round(speedData.reduce((s: number, d: any) => s + d.avg_speed_kmh, 0) / speedData.length) : 0} 
          icon={TrendingDown} 
          color={CHART_COLORS.critical}
          trend="-3 km/h"
          trendUp={false}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traffic Density Chart */}
        <ChartCard title="HOURLY TRAFFIC DENSITY" subtitle="Vehicles per hour across all cameras">
          <Bar data={densityChartData} options={chartOptions} />
        </ChartCard>

        {/* Origin-Destination Flow */}
        <ChartCard title="ORIGIN-DESTINATION FLOW" subtitle="Top 10 camera pairs by vehicle count">
          <Bar data={odChartData} options={horizontalChartOptions} />
        </ChartCard>

        {/* Speed Corridors */}
        <ChartCard title="SPEED CORRIDORS" subtitle="Average speed between camera pairs">
          <Bar data={speedChartData} options={horizontalChartOptions} />
        </ChartCard>

        {/* Vehicle Type Distribution */}
        <ChartCard title="VEHICLE TYPE DISTRIBUTION" subtitle="Classification breakdown">
          <Doughnut data={vehicleTypeData} options={doughnutOptions} />
        </ChartCard>
      </div>

      {/* Heatmap Data Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">CAMERA HEATMAP</h3>
          <span className="badge badge-info">{heatmapData.length} CAMERAS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider border-b border-[var(--border-standard)]">
                <th className="p-3">CAMERA</th>
                <th className="p-3">LOCATION</th>
                <th className="p-3">UNIQUE VEHICLES</th>
                <th className="p-3">TOTAL DETECTIONS</th>
                <th className="p-3">INTENSITY</th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.slice(0, 20).map((cam: any, idx: number) => (
                <tr key={cam.camera_id} className="border-b border-[var(--border-standard)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="p-3 font-mono text-[var(--accent-primary)]">{cam.camera_id}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{cam.camera_label}</td>
                  <td className="p-3 font-mono">{cam.unique_vehicles}</td>
                  <td className="p-3 font-mono">{cam.total_detections}</td>
                  <td className="p-3">
                    <div className="w-32 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                        style={{ width: `${Math.min((cam.unique_vehicles / Math.max(...heatmapData.map((c: any) => c.unique_vehicles))) * 100, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color, trend, trendUp }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[var(--text-muted)] text-[10px] font-mono uppercase tracking-wider mb-2">{label}</div>
          <div className="telemetry-value text-[var(--text-primary)]">{value}</div>
        </div>
        <div className={`p-2 rounded-lg`} style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <span className={`font-mono text-xs ${trendUp ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-critical)]'}`}>
          {trendUp ? '▲' : '▼'} {trend}
        </span>
        <span className="text-[var(--text-muted)] text-xs">vs last period</span>
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: any) {
  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">{title}</h3>
        <p className="text-[10px] text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <div className="card-body flex-1" style={{ minHeight: '280px' }}>
        {children}
      </div>
    </div>
  )
}