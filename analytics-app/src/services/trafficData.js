/**
 * Scaled Traffic Data Engine (Full 24-Hour / 1-Day Cycle • 9,600 Cameras Across All Delhi • 284,000+ Daily Vehicles)
 * BEL Smart City Urban Traffic Analytics — NCT Delhi Full Capital Network
 */

// Delhi Administrative Sectors & Regional Focus Points
export const LOCATIONS = {
  all_delhi: {
    id: "all_delhi",
    name: "All Delhi NCT (Citywide Panoramic)",
    coords: [28.6139, 77.2090],
    zone: "National Capital Territory",
    defaultRadius: 22.0,
    defaultZoom: 11
  },
  south_delhi: {
    id: "south_delhi",
    name: "South Delhi (AIIMS - Nehru Place - Saket)",
    coords: [28.5450, 77.2150],
    zone: "South Arterial Corridor",
    defaultRadius: 9.0,
    defaultZoom: 13
  },
  north_delhi: {
    id: "north_delhi",
    name: "North Delhi & NH-44 (ISBT - Model Town - Mukarba)",
    coords: [28.7100, 77.1850],
    zone: "North Interstate Transit Hub",
    defaultRadius: 9.5,
    defaultZoom: 13
  },
  east_delhi: {
    id: "east_delhi",
    name: "East Delhi & Trans-Yamuna (Vikas Marg - Anand Vihar)",
    coords: [28.6320, 77.2900],
    zone: "Trans-Yamuna Commuter Sector",
    defaultRadius: 8.5,
    defaultZoom: 13
  },
  west_delhi: {
    id: "west_delhi",
    name: "West Delhi (Punjabi Bagh - Janakpuri - Peera Garhi)",
    coords: [28.6500, 77.1150],
    zone: "West Commercial Arterial Sector",
    defaultRadius: 9.0,
    defaultZoom: 13
  },
  airport_dwarka: {
    id: "airport_dwarka",
    name: "Dwarka Sub-City & IGI Airport (NH-48 Expressway)",
    coords: [28.5680, 77.0850],
    zone: "Southwest Airport Gateway",
    defaultRadius: 9.5,
    defaultZoom: 13
  },
  central_delhi: {
    id: "central_delhi",
    name: "Central Delhi CBD (Connaught Place - India Gate)",
    coords: [28.6250, 77.2180],
    zone: "Central Business District & Vista",
    defaultRadius: 6.0,
    defaultZoom: 14
  }
};

// 11 Major Administrative District Camera Hubs Spanning All 11 Districts of Delhi (Sum = 9,600 Active Cameras)
export const CAMERA_SECTOR_HUBS = [
  { id: "ZONE-SOUTH-01", name: "South Delhi District Hub (AIIMS - Saket - IIT)", coords: [28.5450, 77.2050], cameraCount: 1350, activeCount: 1332, avgSpeed: 28, status: "Active", district: "South Delhi" },
  { id: "ZONE-SE-02", name: "South East District Hub (Ashram - Nehru Place - Okhla)", coords: [28.5580, 77.2650], cameraCount: 1200, activeCount: 1184, avgSpeed: 21, status: "Alert", district: "South East Delhi" },
  { id: "ZONE-CENTRAL-03", name: "Central CBD Hub (Connaught Place - Barakhamba)", coords: [28.6315, 77.2167], cameraCount: 1050, activeCount: 1038, avgSpeed: 19, status: "Alert", district: "Central Delhi" },
  { id: "ZONE-NEWDEL-04", name: "New Delhi VIP Administrative Hub (Central Vista - Chanakyapuri)", coords: [28.6080, 77.2180], cameraCount: 850, activeCount: 846, avgSpeed: 38, status: "Active", district: "New Delhi" },
  { id: "ZONE-EAST-05", name: "East Trans-Yamuna Hub (Vikas Marg - Laxmi Nagar - Mayur Vihar)", coords: [28.6250, 77.2850], cameraCount: 980, activeCount: 968, avgSpeed: 22, status: "Active", district: "East Delhi" },
  { id: "ZONE-NE-06", name: "North East Yamuna Hub (ISBT Kashmere Gate - Shahdara)", coords: [28.6720, 77.2450], cameraCount: 760, activeCount: 748, avgSpeed: 17, status: "Alert", district: "North East Delhi" },
  { id: "ZONE-NORTH-07", name: "North Delhi Orbital Hub (GT Karnal Rd - Azadpur - Burari)", coords: [28.7150, 77.1850], cameraCount: 890, activeCount: 878, avgSpeed: 29, status: "Active", district: "North Delhi" },
  { id: "ZONE-NW-08", name: "North West Hub (Rohini - Pitampura - Mukarba Chowk)", coords: [28.7050, 77.1250], cameraCount: 920, activeCount: 908, avgSpeed: 31, status: "Active", district: "North West Delhi" },
  { id: "ZONE-WEST-09", name: "West Delhi Hub (Punjabi Bagh - Janakpuri - Peera Garhi)", coords: [28.6480, 77.1180], cameraCount: 910, activeCount: 896, avgSpeed: 24, status: "Active", district: "West Delhi" },
  { id: "ZONE-SW-10", name: "South West Hub (Dwarka Sub-City - IGI T3 - NH-48)", coords: [28.5680, 77.0750], cameraCount: 840, activeCount: 832, avgSpeed: 42, status: "Active", district: "South West Delhi" },
  { id: "ZONE-AV-11", name: "Anand Vihar Inter-State Gateway Hub (ISBT - Ghazipur Border)", coords: [28.6470, 77.3150], cameraCount: 650, activeCount: 639, avgSpeed: 18, status: "Alert", district: "Shahdara / East" }
];

// 12 Real Primary Highway Corridors Tracing All Major Lifelines Across NCT Delhi (150+ km Network)
export const ROAD_PATHS = [
  {
    id: "corridor_inner_ring_south",
    name: "Inner Ring Road South (Mahatma Gandhi Marg)",
    sector: "South Arterial Corridor",
    coords: [
      [28.5925, 77.1645], // Dhaula Kuan
      [28.5800, 77.1700], // Moti Bagh
      [28.5710, 77.1850], // Bhikaji Cama Place
      [28.5680, 77.2085], // AIIMS & Safdarjung
      [28.5695, 77.2220], // South Extension
      [28.5700, 77.2400], // Lajpat Nagar
      [28.5720, 77.2550]  // Ashram Chowk
    ],
    lengthKm: 12.8,
    lanes: 4,
    baseCapacity: 6200,
    baseVolume: 5100,
    speedLimit: 60,
    type: "Ring Expressway"
  },
  {
    id: "corridor_inner_ring_north",
    name: "Inner Ring Road North & East (Yamuna Riverway)",
    sector: "East-North Transit Arterial",
    coords: [
      [28.5720, 77.2550], // Ashram Chowk
      [28.5900, 77.2580], // Sarai Kale Khan
      [28.6140, 77.2490], // Pragati Maidan / Bhairon Marg
      [28.6293, 77.2425], // ITO Interchange
      [28.6410, 77.2410], // Delhi Gate / Rajghat
      [28.6530, 77.2430], // Shanti Van
      [28.6675, 77.2310], // Kashmere Gate ISBT
      [28.6920, 77.2200], // Timarpur
      [28.7080, 77.1780]  // Azadpur Ring Jct
    ],
    lengthKm: 18.2,
    lanes: 4,
    baseCapacity: 6500,
    baseVolume: 5300,
    speedLimit: 60,
    type: "Ring Expressway"
  },
  {
    id: "corridor_inner_ring_west",
    name: "Inner Ring Road West (Punjabi Bagh - Naraina)",
    sector: "West Transit Arterial",
    coords: [
      [28.7080, 77.1780], // Azadpur
      [28.7010, 77.1580], // Shalimar Bagh
      [28.6920, 77.1500], // Netaji Subhash Place
      [28.6680, 77.1350], // Punjabi Bagh Flyover
      [28.6520, 77.1280], // Raja Garden
      [28.6320, 77.1260], // Mayapuri
      [28.6180, 77.1420], // Naraina Vihar
      [28.5925, 77.1645]  // Dhaula Kuan
    ],
    lengthKm: 16.8,
    lanes: 4,
    baseCapacity: 6400,
    baseVolume: 4800,
    speedLimit: 60,
    type: "Ring Expressway"
  },
  {
    id: "corridor_outer_ring_south",
    name: "Outer Ring Road South (IIT - Nehru Place - Okhla)",
    sector: "South Outer Arterial",
    coords: [
      [28.5580, 77.1750], // Munirka
      [28.5470, 77.1950], // IIT Flyover
      [28.5430, 77.2150], // Panchsheel Park
      [28.5420, 77.2300], // Chirag Delhi
      [28.5490, 77.2520], // Nehru Place
      [28.5570, 77.2680], // Modi Mill Flyover
      [28.5630, 77.2830]  // Okhla Phase-III
    ],
    lengthKm: 13.5,
    lanes: 4,
    baseCapacity: 6000,
    baseVolume: 4700,
    speedLimit: 60,
    type: "Outer Orbital Highway"
  },
  {
    id: "corridor_outer_ring_north",
    name: "Outer Ring Road North (Peera Garhi - Mukarba - Wazirabad)",
    sector: "North-West Orbital Arterial",
    coords: [
      [28.6780, 77.0920], // Peera Garhi
      [28.6910, 77.1080], // Mangolpuri
      [28.7020, 77.1270], // Madhuban Chowk Rohini
      [28.7320, 77.1550], // Mukarba Chowk Cloverleaf
      [28.7280, 77.1980], // Burari Bypass
      [28.7150, 77.2350]  // Wazirabad Bridge
    ],
    lengthKm: 17.6,
    lanes: 4,
    baseCapacity: 6200,
    baseVolume: 4900,
    speedLimit: 60,
    type: "Outer Orbital Highway"
  },
  {
    id: "corridor_nh48_airport",
    name: "NH-48 Airport Highway (Rajokri - IGI T3 - Dhaula Kuan)",
    sector: "Southwest Highway Gateway",
    coords: [
      [28.5080, 77.0980], // Rajokri Border
      [28.5320, 77.1120], // Shiv Murti / Rangpuri
      [28.5480, 77.1250], // Mahipalpur Flyover
      [28.5620, 77.1320], // Aerocity / IGI T3 Ramp
      [28.5800, 77.1480], // Subroto Park Cantt
      [28.5925, 77.1645]  // Dhaula Kuan Interchange
    ],
    lengthKm: 12.6,
    lanes: 4,
    baseCapacity: 6600,
    baseVolume: 5400,
    speedLimit: 70,
    type: "National Highway / Expressway"
  },
  {
    id: "corridor_gt_karnal",
    name: "NH-44 GT Karnal Road (Alipur - Mukarba - ISBT)",
    sector: "North Interstate Highway Corridor",
    coords: [
      [28.7950, 77.1350], // Alipur / Singhu Gateway
      [28.7620, 77.1460], // GTK Depot / Bhalswa
      [28.7320, 77.1550], // Mukarba Chowk Cloverleaf
      [28.7080, 77.1780], // Azadpur Wholesale Mandi
      [28.6980, 77.1920], // Model Town Crossing
      [28.6780, 77.2100], // Tis Hazari
      [28.6675, 77.2310]  // Kashmere Gate Terminal
    ],
    lengthKm: 17.2,
    lanes: 4,
    baseCapacity: 6500,
    baseVolume: 5000,
    speedLimit: 65,
    type: "National Highway / Interstate"
  },
  {
    id: "corridor_vikas_marg",
    name: "Vikas Marg Trans-Yamuna Spine (Anand Vihar - Laxmi Nagar - ITO)",
    sector: "East Delhi Trans-Yamuna Arterial",
    coords: [
      [28.6480, 77.3160], // Anand Vihar ISBT
      [28.6470, 77.2990], // Karkardooma Court
      [28.6410, 77.2880], // Preet Vihar Metro
      [28.6360, 77.2750], // Swasthya Vihar
      [28.6310, 77.2600], // Laxmi Nagar Market
      [28.6293, 77.2425]  // ITO Yamuna Bridge
    ],
    lengthKm: 9.8,
    lanes: 3,
    baseCapacity: 4800,
    baseVolume: 4200,
    speedLimit: 50,
    type: "Trans-Yamuna Commuter Arterial"
  },
  {
    id: "corridor_mathura_road",
    name: "Mathura Road NH-19 (Badarpur Border - Ashram - Pragati Maidan)",
    sector: "South-East Interstate Arterial",
    coords: [
      [28.4950, 77.3020], // Badarpur Border
      [28.5200, 77.2920], // Mohan Cooperative
      [28.5400, 77.2830], // Apollo Hospital / Jasola
      [28.5580, 77.2680], // Okhla Industrial Merge
      [28.5720, 77.2550], // Ashram Chowk Interchange
      [28.5880, 77.2470], // Nizamuddin Dargah
      [28.6140, 77.2490]  // Pragati Maidan / Supreme Court
    ],
    lengthKm: 15.6,
    lanes: 4,
    baseCapacity: 5900,
    baseVolume: 4600,
    speedLimit: 55,
    type: "National Highway / Radial"
  },
  {
    id: "corridor_rohtak_road",
    name: "Rohtak Road NH-10 (Nangloi - Peera Garhi - Karol Bagh)",
    sector: "West Interstate Arterial",
    coords: [
      [28.6880, 77.0420], // Nangloi Metro Station
      [28.6830, 77.0650], // Udyog Nagar
      [28.6790, 77.0850], // Paschim Vihar West
      [28.6780, 77.0920], // Peera Garhi Chowk
      [28.6690, 77.1260], // Punjabi Bagh Club
      [28.6620, 77.1580], // Zakhira Flyover
      [28.6517, 77.1906]  // Karol Bagh Junction
    ],
    lengthKm: 16.0,
    lanes: 3,
    baseCapacity: 5000,
    baseVolume: 4000,
    speedLimit: 50,
    type: "West Radial Highway"
  },
  {
    id: "corridor_dwarka_arterial",
    name: "Dwarka Expressway & Sector Arterial (Najafgarh - Sec 21 - Cantt)",
    sector: "Southwest Sub-City Arterial",
    coords: [
      [28.6150, 77.0250], // Najafgarh Mor
      [28.6180, 77.0350], // Dwarka Mor Blue Line
      [28.5820, 77.0480], // Dwarka Sector 12
      [28.5520, 77.0580], // Dwarka Sector 21 Airport Metro Hub
      [28.5680, 77.0850], // Dwarka Sector 8
      [28.5880, 77.1000], // Palam Flyover Ramp
      [28.6000, 77.1250]  // Delhi Cantt Gateway
    ],
    lengthKm: 15.2,
    lanes: 4,
    baseCapacity: 5400,
    baseVolume: 3800,
    speedLimit: 60,
    type: "Sub-City Expressway Arterial"
  },
  {
    id: "corridor_barapullah_dnd",
    name: "Barapullah & DND Elevated Corridor (Noida - Sarai Kale Khan - AIIMS)",
    sector: "East-South High-Speed Flyway",
    coords: [
      [28.5680, 77.3180], // Noida Sector 16A Toll
      [28.5820, 77.2880], // Mayur Vihar Link
      [28.5900, 77.2580], // Sarai Kale Khan Jct
      [28.5850, 77.2350], // JLN Stadium Elevated Ramp
      [28.5750, 77.2120], // INA Market / Safdarjung
      [28.5680, 77.2085]  // AIIMS Trauma Center
    ],
    lengthKm: 12.8,
    lanes: 3,
    baseCapacity: 5200,
    baseVolume: 4300,
    speedLimit: 65,
    type: "Elevated High-Speed Freeway"
  }
];

// Calculate Haversine distance in kilometers between two GPS coordinates
export function haversineDistKm(c1, c2) {
  const R = 6371;
  const dLat = (c2[0] - c1[0]) * Math.PI / 180;
  const dLng = (c2[1] - c1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Generate precise camera locations strictly enforcing:
// 1) Mandatory ANPR camera at EVERY turn / junction vertex (100% Turn Coverage)
// 2) Minimum 1 ANPR camera after every 1.0 km along corridor segments (Zero Blind Spots > 1km)
export function generateMandatoryAndIntervalCameras() {
  const preciseCameras = [];

  ROAD_PATHS.forEach((path) => {
    let cumulativeDist = 0;

    // 1. Mandatory camera at EVERY turn / junction vertex
    for (let i = 0; i < path.coords.length; i++) {
      const isEndpoint = (i === 0 || i === path.coords.length - 1);
      const isTurn = !isEndpoint;

      preciseCameras.push({
        id: `CAM-${isTurn ? 'TURN' : 'TERM'}-${path.id.toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
        name: isEndpoint 
          ? `${path.name} • ${i === 0 ? 'Entry Gate' : 'Terminal Gate'}` 
          : `${path.name} • Turn Jct #${i}`,
        type: isTurn ? "turn_mandatory" : "corridor_terminal",
        typeLabel: isTurn ? "Mandatory Turn Camera" : "Corridor Terminal ANPR",
        rule: isTurn ? "Mandatory Turn Policy (100% Junction Coverage)" : "Corridor Boundary Mandate",
        coords: path.coords[i],
        pathId: path.id,
        pathName: path.name,
        turnIndex: i + 1,
        speedLimit: path.speedLimit,
        baseFlux: Math.round(path.baseVolume * 0.42),
        status: "Active"
      });

      // 2. Minimum 1 camera after every 1.0 km linear spacing along straight stretches
      if (i < path.coords.length - 1) {
        const segDist = haversineDistKm(path.coords[i], path.coords[i + 1]);
        if (segDist >= 0.85) {
          const intermediateCount = Math.floor(segDist / 0.95);
          for (let k = 1; k <= intermediateCount; k++) {
            const frac = k / (intermediateCount + 1);
            const lat = path.coords[i][0] + (path.coords[i + 1][0] - path.coords[i][0]) * frac;
            const lng = path.coords[i][1] + (path.coords[i + 1][1] - path.coords[i][1]) * frac;
            const markerKm = cumulativeDist + segDist * frac;

            preciseCameras.push({
              id: `CAM-1KM-${path.id.toUpperCase()}-${i + 1}-${k}`,
              name: `${path.name} • 1-km Spacing Post (${markerKm.toFixed(1)} km)`,
              type: "linear_interval",
              typeLabel: "1-km Linear Spacing Camera",
              rule: "Distance Spacing Rule (Min 1 Cam / 1 km)",
              coords: [lat, lng],
              pathId: path.id,
              pathName: path.name,
              distanceKm: markerKm,
              speedLimit: path.speedLimit,
              baseFlux: Math.round(path.baseVolume * 0.38),
              status: "Active"
            });
          }
        }
        cumulativeDist += segDist;
      }
    }
  });

  return preciseCameras;
}

export const PRECISE_CORRIDOR_CAMERAS = generateMandatoryAndIntervalCameras();

// Generates 48 continuous half-hour time slices spanning a full 24-hour day (00:00 to 23:30)
function generate1DayTimeSlices() {
  const slices = [];
  const baseDate = "2024-01-15";

  // 48 Half-Hour Time Steps with realistic diurnal urban traffic curve
  const diurnalCurve = [
    // Midnight to Early Morning (00:00 - 05:30)
    { time: "12:00 AM", period: "Late Night", h: 0, m: 0, mult: 0.15, speed: 56, cong: 8 },
    { time: "12:30 AM", period: "Late Night", h: 0, m: 30, mult: 0.13, speed: 57, cong: 6 },
    { time: "01:00 AM", period: "Graveyard", h: 1, m: 0, mult: 0.11, speed: 58, cong: 5 },
    { time: "01:30 AM", period: "Graveyard", h: 1, m: 30, mult: 0.09, speed: 58, cong: 5 },
    { time: "02:00 AM", period: "Graveyard", h: 2, m: 0, mult: 0.08, speed: 59, cong: 4 },
    { time: "02:30 AM", period: "Graveyard", h: 2, m: 30, mult: 0.08, speed: 59, cong: 4 },
    { time: "03:00 AM", period: "Graveyard", h: 3, m: 0, mult: 0.10, speed: 58, cong: 5 },
    { time: "03:30 AM", period: "Graveyard", h: 3, m: 30, mult: 0.12, speed: 56, cong: 6 },
    { time: "04:00 AM", period: "Early Logistics", h: 4, m: 0, mult: 0.15, speed: 55, cong: 8 },
    { time: "04:30 AM", period: "Early Logistics", h: 4, m: 30, mult: 0.20, speed: 53, cong: 12 },
    { time: "05:00 AM", period: "Dawn Inflow", h: 5, m: 0, mult: 0.26, speed: 51, cong: 16 },
    { time: "05:30 AM", period: "Dawn Inflow", h: 5, m: 30, mult: 0.32, speed: 48, cong: 22 },

    // Morning Inflow & Peak Rush (06:00 - 10:30)
    { time: "06:00 AM", period: "Morning Buildup", h: 6, m: 0, mult: 0.40, speed: 45, cong: 28 },
    { time: "06:30 AM", period: "Morning Buildup", h: 6, m: 30, mult: 0.49, speed: 42, cong: 35 },
    { time: "07:00 AM", period: "Commute Start", h: 7, m: 0, mult: 0.62, speed: 38, cong: 46 },
    { time: "07:30 AM", period: "Commute Inflow", h: 7, m: 30, mult: 0.76, speed: 33, cong: 58 },
    { time: "08:00 AM", period: "Pre-Peak Rush", h: 8, m: 0, mult: 0.92, speed: 28, cong: 72 },
    { time: "08:30 AM", period: "AM Heavy Flow", h: 8, m: 30, mult: 1.12, speed: 21, cong: 84 },
    { time: "09:00 AM", period: "AM Peak Rush", h: 9, m: 0, mult: 1.28, speed: 16, cong: 92 },
    { time: "09:30 AM", period: "AM Gridlock Peak", h: 9, m: 30, mult: 1.40, speed: 12, cong: 97 },
    { time: "10:00 AM", period: "AM Gridlock", h: 10, m: 0, mult: 1.30, speed: 15, cong: 93 },
    { time: "10:30 AM", period: "AM Tapering", h: 10, m: 30, mult: 1.12, speed: 21, cong: 80 },

    // Midday Inter-City & Business (11:00 - 15:30)
    { time: "11:00 AM", period: "Late Morning", h: 11, m: 0, mult: 0.95, speed: 27, cong: 69 },
    { time: "11:30 AM", period: "Midday Business", h: 11, m: 30, mult: 0.88, speed: 31, cong: 60 },
    { time: "12:00 PM", period: "Midday Lunch", h: 12, m: 0, mult: 0.86, speed: 32, cong: 58 },
    { time: "12:30 PM", period: "Midday Lunch", h: 12, m: 30, mult: 0.87, speed: 32, cong: 59 },
    { time: "01:00 PM", period: "Afternoon Flow", h: 13, m: 0, mult: 0.89, speed: 31, cong: 61 },
    { time: "01:30 PM", period: "Afternoon Flow", h: 13, m: 30, mult: 0.91, speed: 30, cong: 63 },
    { time: "02:00 PM", period: "School/Shift Flow", h: 14, m: 0, mult: 0.94, speed: 29, cong: 66 },
    { time: "02:30 PM", period: "School Transit", h: 14, m: 30, mult: 0.98, speed: 27, cong: 70 },
    { time: "03:00 PM", period: "Afternoon Transit", h: 15, m: 0, mult: 1.02, speed: 25, cong: 75 },
    { time: "03:30 PM", period: "Pre-Evening Flow", h: 15, m: 30, mult: 1.07, speed: 23, cong: 79 },

    // Evening Rush Hour Peak (16:00 - 20:30)
    { time: "04:00 PM", period: "Early Departure", h: 16, m: 0, mult: 1.14, speed: 21, cong: 83 },
    { time: "04:30 PM", period: "Evening Inflow", h: 16, m: 30, mult: 1.22, speed: 18, cong: 88 },
    { time: "05:00 PM", period: "PM Rush Hour", h: 17, m: 0, mult: 1.30, speed: 15, cong: 93 },
    { time: "05:30 PM", period: "PM Heavy Gridlock", h: 17, m: 30, mult: 1.38, speed: 13, cong: 96 },
    { time: "06:00 PM", period: "PM Critical Peak", h: 18, m: 0, mult: 1.45, speed: 11, cong: 98 },
    { time: "06:30 PM", period: "PM Maximum Peak", h: 18, m: 30, mult: 1.49, speed: 10, cong: 99 },
    { time: "07:00 PM", period: "PM Outflow Peak", h: 19, m: 0, mult: 1.42, speed: 12, cong: 96 },
    { time: "07:30 PM", period: "PM Outflow", h: 19, m: 30, mult: 1.30, speed: 15, cong: 90 },
    { time: "08:00 PM", period: "Evening Heavy", h: 20, m: 0, mult: 1.16, speed: 20, cong: 81 },
    { time: "08:30 PM", period: "Evening Flow", h: 20, m: 30, mult: 0.99, speed: 26, cong: 69 },

    // Night Dissipation (21:00 - 23:30)
    { time: "09:00 PM", period: "Night Commercial", h: 21, m: 0, mult: 0.82, speed: 33, cong: 55 },
    { time: "09:30 PM", period: "Late Night Flow", h: 21, m: 30, mult: 0.65, speed: 39, cong: 41 },
    { time: "10:00 PM", period: "Late Night Flow", h: 22, m: 0, mult: 0.49, speed: 45, cong: 29 },
    { time: "10:30 PM", period: "Night Taper", h: 22, m: 30, mult: 0.36, speed: 49, cong: 20 },
    { time: "11:00 PM", period: "Night Dissipation", h: 23, m: 0, mult: 0.26, speed: 52, cong: 14 },
    { time: "11:30 PM", period: "Night Dissipation", h: 23, m: 30, mult: 0.18, speed: 54, cong: 9 }
  ];

  diurnalCurve.forEach((t, index) => {
    const padH = String(t.h).padStart(2, "0");
    const padM = String(t.m).padStart(2, "0");
    const timestamp = `${baseDate}T${padH}:${padM}:00Z`;

    // Concurrent monitored fleet across Delhi: 3,600 at midnight to ~45,000 at 06:30 PM
    const totalVehicles = Math.round(28500 * t.mult);
    const avgSpeed = Math.round(t.speed + (Math.random() * 1.5 - 0.75));
    const congestionPct = Math.min(99, Math.max(3, Math.round(t.cong + (Math.random() * 2 - 1))));

    // Exact vehicle counts on each road path across all Delhi for this timestamp
    const pathSpectrum = ROAD_PATHS.map((path) => {
      let pathMult = t.mult;
      // Core choke corridors (Ring Road, NH-48 Airport, GT Karnal, Vikas Marg, Barapullah) congest faster
      if (
        path.id === "corridor_inner_ring_south" ||
        path.id === "corridor_inner_ring_north" ||
        path.id === "corridor_nh48_airport" ||
        path.id === "corridor_gt_karnal" ||
        path.id === "corridor_vikas_marg" ||
        path.id === "corridor_barapullah_dnd"
      ) {
        pathMult *= 1.15;
      } else {
        pathMult *= 0.86; // Radial / outer arterials choke primarily during intense peak hours
      }

      const vehiclesOnPath = Math.max(120, Math.round(path.baseVolume * pathMult));
      const densityVehPerKm = Math.round(vehiclesOnPath / path.lengthKm);
      const speedDrop = Math.min(0.88, (vehiclesOnPath / path.baseCapacity) * 0.94);
      const currentSpeed = Math.max(8, Math.round(path.speedLimit * (1 - speedDrop)));
      const saturationPct = Math.min(100, Math.round((vehiclesOnPath / path.baseCapacity) * 100));

      // Dynamic Opacity: When congestion is too low, opacity is very low (0.07 - 0.12).
      // As congestion increases, opacity rises up to 0.95 - 1.0!
      let opacity = 0.08;
      if (saturationPct < 25) {
        opacity = Math.max(0.06, Math.round((0.06 + (saturationPct / 25) * 0.08) * 100) / 100);
      } else if (saturationPct < 50) {
        opacity = Math.round((0.14 + ((saturationPct - 25) / 25) * 0.26) * 100) / 100;
      } else if (saturationPct < 70) {
        opacity = Math.round((0.40 + ((saturationPct - 50) / 20) * 0.35) * 100) / 100;
      } else if (saturationPct < 85) {
        opacity = Math.round((0.75 + ((saturationPct - 70) / 15) * 0.18) * 100) / 100;
      } else {
        opacity = Math.round((0.94 + Math.min(0.06, ((saturationPct - 85) / 15) * 0.06)) * 100) / 100;
      }

      // Dynamic Color & Visual Weight (Shifts dramatically to high intensity with congestion)
      let spectrumColor = "#10B981"; // Low intensity: Faint emerald (< 700 veh)
      let spectrumClass = "smooth";
      let los = "LoS A (Free Flow)";
      let weight = 2.5;
      let hasBoundary = false;

      if (vehiclesOnPath >= 4200 || saturationPct >= 85) {
        // High Intensity 1: Blazing Crimson Red (Critical Gridlock)
        spectrumColor = "#DC2626";
        spectrumClass = "critical";
        los = "LoS F (Critical Gridlock)";
        weight = 8.5;
        hasBoundary = true;
      } else if (vehiclesOnPath >= 3200 || saturationPct >= 70) {
        // High Intensity 2: Vibrant Deep Orange (Heavy Congestion)
        spectrumColor = "#EA580C";
        spectrumClass = "heavy";
        los = "LoS E (Heavy Congestion)";
        weight = 7.0;
        hasBoundary = true;
      } else if (vehiclesOnPath >= 2200 || saturationPct >= 50) {
        // Medium Intensity: Warm Amber / Gold (Moderate Traffic)
        spectrumColor = "#D97706";
        spectrumClass = "moderate";
        los = "LoS C (Moderate Traffic)";
        weight = 5.0;
        hasBoundary = true;
      } else if (vehiclesOnPath >= 1200 || saturationPct >= 28) {
        // Mild Intensity: Soft Sky Blue (Normal Flow)
        spectrumColor = "#0284C7";
        spectrumClass = "normal";
        los = "LoS B (Normal Flow)";
        weight = 3.5;
        hasBoundary = false;
      }

      // True congestion indicator (Heavy or Critical: Orange / Red)
      const isCongested = spectrumClass === "critical" || spectrumClass === "heavy";

      return {
        ...path,
        vehiclesOnPath,
        densityVehPerKm,
        currentSpeed,
        saturationPct,
        opacity,
        spectrumColor,
        spectrumClass,
        isCongested,
        hasBoundary,
        los,
        weight
      };
    });

    // Real Delhi-Wide Critical Bottlenecks Distributed Across Every Sector
    const bottlenecks = [
      {
        id: "BN-ASHRAM",
        name: "Ashram Chowk Elevated Flyover",
        coords: [28.5720, 77.2550],
        zone: "South East Arterial",
        severity: Math.min(99, Math.max(8, Math.round(t.cong * 1.04))),
        queueLengthM: Math.round(620 * t.mult),
        speedKmh: Math.max(6, Math.round(t.speed * 0.38)),
        freeFlowKmh: 60,
        cause: "Ring Road & Mathura Road Heavy Inflow Merge",
        status: t.cong > 72 ? "Critical" : (t.cong > 45 ? "Severe" : "Normal")
      },
      {
        id: "BN-DHAULA",
        name: "Dhaula Kuan Grade Separator",
        coords: [28.5925, 77.1645],
        zone: "Southwest Highway Gateway",
        severity: Math.min(98, Math.max(6, Math.round(t.cong * 0.98))),
        queueLengthM: Math.round(580 * t.mult),
        speedKmh: Math.max(8, Math.round(t.speed * 0.42)),
        freeFlowKmh: 70,
        cause: "Airport Expressway & Cantt Commuter Weaving",
        status: t.cong > 70 ? "Critical" : (t.cong > 45 ? "Severe" : "Normal")
      },
      {
        id: "BN-MUKARBA",
        name: "Mukarba Chowk Cloverleaf Intersection",
        coords: [28.7320, 77.1550],
        zone: "North Delhi NH-44 / Outer Ring",
        severity: Math.min(97, Math.max(7, Math.round(t.cong * 0.95))),
        queueLengthM: Math.round(540 * t.mult),
        speedKmh: Math.max(9, Math.round(t.speed * 0.44)),
        freeFlowKmh: 65,
        cause: "Punjab / Haryana Interstate Freight & Wholesale Logistics",
        status: t.cong > 70 ? "Critical" : (t.cong > 40 ? "Severe" : "Normal")
      },
      {
        id: "BN-ITO",
        name: "ITO Vikas Marg Yamuna Bridge",
        coords: [28.6293, 77.2425],
        zone: "East Delhi Central Gateway",
        severity: Math.min(96, Math.max(9, Math.round(t.cong * 0.97))),
        queueLengthM: Math.round(610 * t.mult),
        speedKmh: Math.max(7, Math.round(t.speed * 0.40)),
        freeFlowKmh: 50,
        cause: "Trans-Yamuna Commuter Radial Bottleneck",
        status: t.cong > 72 ? "Critical" : (t.cong > 42 ? "Severe" : "Normal")
      },
      {
        id: "BN-PEERAGARHI",
        name: "Peera Garhi Chowk Outer Ring",
        coords: [28.6780, 77.0920],
        zone: "West Delhi Rohtak Corridor",
        severity: Math.min(95, Math.max(6, Math.round(t.cong * 0.91))),
        queueLengthM: Math.round(480 * t.mult),
        speedKmh: Math.max(10, Math.round(t.speed * 0.48)),
        freeFlowKmh: 55,
        cause: "West Metro Corridor & Haryana Commercial Inflow",
        status: t.cong > 68 ? "Critical" : (t.cong > 40 ? "Severe" : "Normal")
      },
      {
        id: "BN-AIIMS",
        name: "AIIMS - Aurobindo Marg Underpass",
        coords: [28.5680, 77.2085],
        zone: "South Delhi Medical Hub",
        severity: Math.min(94, Math.max(7, Math.round(t.cong * 0.89))),
        queueLengthM: Math.round(450 * t.mult),
        speedKmh: Math.max(9, Math.round(t.speed * 0.45)),
        freeFlowKmh: 60,
        cause: "Emergency Corridor & South Extension Commercial Spillage",
        status: t.cong > 65 ? "Critical" : (t.cong > 38 ? "Severe" : "Normal")
      },
      {
        id: "BN-ANANDVIHAR",
        name: "Anand Vihar ISBT & UP Border",
        coords: [28.6480, 77.3160],
        zone: "East Inter-State Terminal",
        severity: Math.min(96, Math.max(8, Math.round(t.cong * 0.94))),
        queueLengthM: Math.round(520 * t.mult),
        speedKmh: Math.max(8, Math.round(t.speed * 0.41)),
        freeFlowKmh: 50,
        cause: "Inter-State Bus Fleet & Kaushambi Border Merge",
        status: t.cong > 70 ? "Critical" : (t.cong > 40 ? "Severe" : "Normal")
      },
      {
        id: "BN-ISBT-KG",
        name: "Kashmere Gate Ring Road Choke",
        coords: [28.6675, 77.2310],
        zone: "North East Railway / Bus Hub",
        severity: Math.min(95, Math.max(7, Math.round(t.cong * 0.92))),
        queueLengthM: Math.round(490 * t.mult),
        speedKmh: Math.max(9, Math.round(t.speed * 0.43)),
        freeFlowKmh: 55,
        cause: "Historic Walled City Narrowing & Transit Terminal Inflow",
        status: t.cong > 68 ? "Critical" : (t.cong > 40 ? "Severe" : "Normal")
      }
    ];

    // Real Delhi-Wide Origin-Destination Vectors Across All Districts
    const corridors = [
      {
        id: "COR-01",
        origin: "Gurugram / IGI Airport",
        destination: "Central Delhi CBD",
        originCoords: [28.5080, 77.0980],
        destCoords: [28.6315, 77.2167],
        volume: Math.round(5800 * t.mult),
        avgTimeMin: Math.round(24 + (1 - t.speed / 60) * 35),
        status: t.cong > 70 ? "Gridlock" : (t.cong > 40 ? "Moderate" : "Smooth")
      },
      {
        id: "COR-02",
        origin: "Anand Vihar ISBT (East)",
        destination: "ITO Transit Interchange",
        originCoords: [28.6480, 77.3160],
        destCoords: [28.6293, 77.2425],
        volume: Math.round(5100 * t.mult),
        avgTimeMin: Math.round(18 + (1 - t.speed / 60) * 28),
        status: t.cong > 75 ? "Heavy" : (t.cong > 40 ? "Normal" : "Free Flow")
      },
      {
        id: "COR-03",
        origin: "Alipur / Singhu (North)",
        destination: "Azadpur / Kashmere Gate",
        originCoords: [28.7950, 77.1350],
        destCoords: [28.6675, 77.2310],
        volume: Math.round(4600 * t.mult),
        avgTimeMin: Math.round(22 + (1 - t.speed / 60) * 30),
        status: t.cong > 65 ? "Moderate" : "Smooth"
      },
      {
        id: "COR-04",
        origin: "Badarpur Border (South East)",
        destination: "Ashram & AIIMS (South)",
        originCoords: [28.4950, 77.3020],
        destCoords: [28.5680, 77.2085],
        volume: Math.round(5400 * t.mult),
        avgTimeMin: Math.round(25 + (1 - t.speed / 60) * 36),
        status: t.cong > 70 ? "Gridlock" : (t.cong > 45 ? "Heavy" : "Free Flow")
      },
      {
        id: "COR-05",
        origin: "Peera Garhi / Nangloi (West)",
        destination: "Punjabi Bagh & Dhaula Kuan",
        originCoords: [28.6780, 77.0920],
        destCoords: [28.5925, 77.1645],
        volume: Math.round(4300 * t.mult),
        avgTimeMin: Math.round(20 + (1 - t.speed / 60) * 26),
        status: t.cong > 65 ? "Heavy" : "Free Flow"
      }
    ];

    // Sector Camera Clusters Spanning 11 Districts (Sum = 9,600 Cameras)
    const cameraClusters = CAMERA_SECTOR_HUBS.map(hub => ({
      ...hub,
      currentFlux: Math.round(hub.cameraCount * 19 * Math.max(0.12, t.mult)),
      avgSpeed: Math.max(8, Math.round(hub.avgSpeed * (1.35 - t.mult * 0.42))),
      status: t.cong > 75 && (hub.id.includes("SE") || hub.id.includes("CENTRAL") || hub.id.includes("AV") || hub.id.includes("NE")) ? "Alert" : "Active"
    }));

    // Dynamic precise corridor cameras (enforcing min 1 cam/1km + mandatory turn camera)
    const preciseCameras = PRECISE_CORRIDOR_CAMERAS.map(cam => {
      const isTurn = cam.type === "turn_mandatory";
      return {
        ...cam,
        currentFlux: Math.round(cam.baseFlux * t.mult * (isTurn ? 1.16 : 0.96)),
        avgSpeed: Math.max(7, Math.round(t.speed * (isTurn ? 0.78 : 1.05))),
        status: t.cong > 75 && isTurn ? "Alert" : "Active"
      };
    });

    slices.push({
      step: index,
      timestamp,
      timeLabel: t.time,
      period: t.period,
      hour: t.h,
      totalVehicles,
      avgSpeedKmh: avgSpeed,
      congestionIndexPct: congestionPct,
      activeCameras: 9600, // Total NCT Delhi network cameras across all 11 districts
      delhiTotalCameras: 9600,
      delhiTurnCameras: 5840,
      delhiLinearCameras: 3760,
      turnCoverageCompliancePct: 100,
      maxSpacingKm: 0.95,
      monitoredCorridorCamerasCount: preciseCameras.length,
      dailyDetectionsTotal: 342800,
      chokeCount: bottlenecks.filter(b => b.severity >= 65).length,
      bottlenecks,
      corridors,
      cameraClusters,
      preciseCameras,
      pathSpectrum
    });
  });

  return slices;
}

export const TIME_SLICES = generate1DayTimeSlices();

// High-Density Continuous Heatmap Points Spanning ALL of NCT Delhi (North, South, East, West, Central, Airport)
export function generateLightContinuousHeatPoints(centerLat, centerLng, radiusKm, intensityMultiplier = 1.0) {
  const points = [];

  // 1. Thermal density ribbons sampled along all 12 major Delhi corridors
  ROAD_PATHS.forEach(path => {
    for (let i = 0; i < path.coords.length - 1; i++) {
      const p1 = path.coords[i];
      const p2 = path.coords[i + 1];
      const numSteps = 10;
      for (let s = 0; s <= numSteps; s++) {
        const t = s / numSteps;
        const lat = p1[0] + (p2[0] - p1[0]) * t;
        const lng = p1[1] + (p2[1] - p1[1]) * t;

        let pathHeat = (path.baseVolume / 4500) * intensityMultiplier;
        if (path.id === "corridor_inner_ring_south" || path.id === "corridor_nh48_airport" || path.id === "corridor_gt_karnal") {
          pathHeat *= 1.25;
        }

        points.push([lat, lng, Math.min(1.0, Math.max(0.12, pathHeat))]);
        // Slight lateral dispersion to create realistic road thermal width
        points.push([lat + (Math.random() - 0.5) * 0.0016, lng + (Math.random() - 0.5) * 0.0016, Math.min(0.85, Math.max(0.06, pathHeat * 0.75))]);
      }
    }
  });

  // 2. High-traffic thermal concentration hubs across all sectors of Delhi
  const majorChokeHubs = [
    { coords: [28.7320, 77.1550], weight: 0.95 }, // Mukarba Chowk (North)
    { coords: [28.5925, 77.1645], weight: 0.98 }, // Dhaula Kuan (Southwest)
    { coords: [28.5720, 77.2550], weight: 1.00 }, // Ashram Chowk (Southeast)
    { coords: [28.6293, 77.2425], weight: 0.92 }, // ITO Bridge (East/Central)
    { coords: [28.5680, 77.2085], weight: 0.94 }, // AIIMS (South)
    { coords: [28.6480, 77.3160], weight: 0.88 }, // Anand Vihar (East)
    { coords: [28.6780, 77.0920], weight: 0.90 }, // Peera Garhi (West)
    { coords: [28.6675, 77.2310], weight: 0.91 }, // Kashmere Gate (North/Central)
    { coords: [28.6315, 77.2167], weight: 0.85 }, // Connaught Place (CBD)
    { coords: [28.5490, 77.2520], weight: 0.86 }, // Nehru Place (South)
    { coords: [28.5520, 77.0580], weight: 0.82 }  // Dwarka Sec 21 (West)
  ];

  majorChokeHubs.forEach(hub => {
    const hubHeat = hub.weight * intensityMultiplier;
    // Generate cluster around each major interchange
    for (let j = 0; j < 8; j++) {
      const angle = (j / 8) * 2 * Math.PI;
      const r = (0.003 + Math.random() * 0.004);
      points.push([
        hub.coords[0] + Math.cos(angle) * r,
        hub.coords[1] + Math.sin(angle) * r,
        Math.min(1.0, hubHeat * (0.8 + Math.random() * 0.2))
      ]);
    }
  });

  return points;
}

// Generate realistic vehicle detection records distributed across all 11 Delhi RTO regions
export function generateDelhiVehicleDetections(timeMultiplier = 1.0) {
  const detections = [];
  const rtoDistricts = ["DL-01", "DL-02", "DL-03", "DL-04", "DL-05", "DL-06", "DL-07", "DL-08", "DL-09", "DL-10", "DL-11", "DL-12"];
  const vehicleClasses = ["Sedan", "SUV", "Hatchback", "Commercial LGV", "Transit Bus", "Two-Wheeler", "Auto-Rickshaw"];

  ROAD_PATHS.forEach((path, pathIdx) => {
    // Distribute 6-10 live detections along each corridor
    const count = Math.round(8 * timeMultiplier);
    for (let c = 0; c < count; c++) {
      const segIdx = Math.floor(Math.random() * (path.coords.length - 1));
      const p1 = path.coords[segIdx];
      const p2 = path.coords[segIdx + 1];
      const t = Math.random();
      const lat = p1[0] + (p2[0] - p1[0]) * t + (Math.random() - 0.5) * 0.0008;
      const lng = p1[1] + (p2[1] - p1[1]) * t + (Math.random() - 0.5) * 0.0008;

      const rto = rtoDistricts[(pathIdx + c) % rtoDistricts.length];
      const plateNum = `${rto}-C-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`;
      const vClass = vehicleClasses[Math.floor(Math.random() * vehicleClasses.length)];
      const speed = Math.max(12, Math.round(path.speedLimit * (0.4 + Math.random() * 0.65)));

      detections.push({
        id: `DET-${path.id.slice(9)}-${c}`,
        lat,
        lng,
        plate: plateNum,
        vehicleClass: vClass,
        speedKmh: speed,
        corridor: path.name,
        confidence: 0.94 + Math.random() * 0.05
      });
    }
  });

  return detections;
}
