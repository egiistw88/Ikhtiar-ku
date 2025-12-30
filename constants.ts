
import { Hotspot } from './types';

// OPTIMISASI DATA BANDUNG: Hotspot Lengkap & Akurat
// Menggunakan logika "Archetype" dengan data real kondisi Bandung
// isDaily: true = ramai setiap hari | day: spesifik = ramai di hari tertentu

export const INITIAL_DATA: Hotspot[] = [
  // --- DINI HARI (03:00 - 05:00) - Market & Early Logistics ---
  {
    "id": "seed-dawn-market-1",
    "date": "",
    "day": "All",
    "time_window": "Dini Hari",
    "predicted_hour": "04:00",
    "origin": "Pasar Induk Caringin",
    "type": "Bike Delivery",
    "category": "Market",
    "lat": -6.9350,
    "lng": 107.5750,
    "zone": "Caringin",
    "notes": "Pusat logistik pasar paling gede. Orderan barang/belanjaan pedagang. Peak 04:00-06:00.",
    "isDaily": true,
    "baseScore": 85
  },
  {
    "id": "seed-dawn-market-2",
    "date": "",
    "day": "All",
    "time_window": "Dini Hari",
    "predicted_hour": "04:30",
    "origin": "Pasar Kosambi",
    "type": "Bike Delivery",
    "category": "Market",
    "lat": -6.9200,
    "lng": 107.5950,
    "zone": "Kosambi",
    "notes": "Pasar sayur tradisional. Orderan kirim ke warung/resto awal hari.",
    "isDaily": true,
    "baseScore": 75
  },
  
  // --- MORNING RUSH (05:00 - 09:00) ---
  {
    "id": "seed-morning-1",
    "date": "",
    "day": "Senin",
    "time_window": "Pagi",
    "predicted_hour": "06:30",
    "origin": "Komplek Antapani (Terusan Jakarta)",
    "type": "Bike",
    "category": "Residential",
    "lat": -6.9120,
    "lng": 107.6600,
    "zone": "Antapani",
    "notes": "Senin Morning Syndrome! Traffic berangkat kerja super padat. Orderan pendek tapi banyak.",
    "isDaily": false,
    "baseScore": 90
  },
  {
    "id": "seed-morning-2",
    "date": "",
    "day": "All",
    "time_window": "Pagi",
    "predicted_hour": "06:45",
    "origin": "Komplek Buah Batu / Ciwastra",
    "type": "Bike",
    "category": "Residential",
    "lat": -6.9600,
    "lng": 107.6350,
    "zone": "Buah Batu",
    "notes": "Perumahan padat. Anak sekolah + karyawan berangkat bersamaan.",
    "isDaily": true,
    "baseScore": 88
  },
  {
    "id": "seed-morning-3",
    "date": "",
    "day": "All",
    "time_window": "Pagi",
    "predicted_hour": "07:00",
    "origin": "SDN/SMPN Favorit (Banjarsari/BPI)",
    "type": "Bike",
    "category": "Education",
    "lat": -6.9150,
    "lng": 107.6100,
    "zone": "Pusat Kota",
    "notes": "Antar anak sekolah. Spot pasti ramai jam segini. Feeder spot terbaik!",
    "isDaily": true,
    "baseScore": 92
  },
  {
    "id": "seed-morning-4",
    "date": "",
    "day": "All",
    "time_window": "Pagi",
    "predicted_hour": "07:30",
    "origin": "Terminal Cicaheum",
    "type": "Bike",
    "category": "Transport Hub",
    "lat": -6.9180,
    "lng": 107.6580,
    "zone": "Cicaheum",
    "notes": "Penumpang turun bus antar kota lanjut ojol ke tujuan akhir.",
    "isDaily": true,
    "baseScore": 82
  },
  {
    "id": "seed-morning-5",
    "date": "",
    "day": "All",
    "time_window": "Pagi",
    "predicted_hour": "08:00",
    "origin": "Stasiun Bandung (Pintu Selatan)",
    "type": "Bike",
    "category": "Transport Hub",
    "lat": -6.9126,
    "lng": 107.6024,
    "zone": "Kebon Kawung",
    "notes": "Kedatangan kereta eksekutif pagi & karyawan luar kota. Sniper spot jarak jauh!",
    "isDaily": true,
    "baseScore": 95
  },
  {
    "id": "seed-morning-6",
    "date": "",
    "day": "All",
    "time_window": "Pagi",
    "predicted_hour": "08:30",
    "origin": "Gedung Sate / Perkantoran Dinas",
    "type": "Bike",
    "category": "Gov/Facility",
    "lat": -6.9020,
    "lng": 107.6190,
    "zone": "Gasibu",
    "notes": "PNS telat manggut. Orderan last minute ke kantor pemerintahan.",
    "isDaily": true,
    "baseScore": 80
  },

  // --- LUNCH RUSH (11:00 - 14:00) ---
  {
    "id": "seed-lunch-1",
    "date": "",
    "day": "All",
    "time_window": "Siang",
    "predicted_hour": "11:30",
    "origin": "Area Industri Cimahi / Baros",
    "type": "Food",
    "category": "Commercial",
    "lat": -6.8900,
    "lng": 107.5420,
    "zone": "Cimahi",
    "notes": "Buruh pabrik makan siang. Orderan deras sekali, pendek-pendek.",
    "isDaily": true,
    "baseScore": 90
  },
  {
    "id": "seed-lunch-2",
    "date": "",
    "day": "All",
    "time_window": "Siang",
    "predicted_hour": "11:45",
    "origin": "Area Perkantoran Asia Afrika",
    "type": "Food",
    "category": "Commercial",
    "lat": -6.9210,
    "lng": 107.6100,
    "zone": "Alun-alun",
    "notes": "Karyawan bank/kantor pesen food. Peak 11:30-12:30.",
    "isDaily": true,
    "baseScore": 88
  },
  {
    "id": "seed-lunch-3",
    "date": "",
    "day": "All",
    "time_window": "Siang",
    "predicted_hour": "12:00",
    "origin": "Kantor-kantor Gatot Subroto",
    "type": "Food",
    "category": "Commercial",
    "lat": -6.9240,
    "lng": 107.6320,
    "zone": "Gatot Subroto",
    "notes": "Kawasan perkantoran besar. Orderan food & kirim dokumen.",
    "isDaily": true,
    "baseScore": 86
  },
  {
    "id": "seed-lunch-4",
    "date": "",
    "day": "All",
    "time_window": "Siang",
    "predicted_hour": "12:15",
    "origin": "Mie Gacoan / Richeese / McD",
    "type": "Food",
    "category": "Culinary",
    "lat": -6.9000,
    "lng": 107.6150,
    "zone": "Dipatiukur",
    "notes": "Antrian driver panjang = Orderan melimpah. Feeder heaven!",
    "isDaily": true,
    "baseScore": 94
  },
  {
    "id": "seed-lunch-5",
    "date": "",
    "day": "All",
    "time_window": "Siang",
    "predicted_hour": "13:00",
    "origin": "Kampus ITB / Unpad Dipatiukur",
    "type": "Food",
    "category": "Education",
    "lat": -6.8910,
    "lng": 107.6100,
    "zone": "Dago",
    "notes": "Mahasiswa lapar abis kuliah pagi. Orderan food ke kampus.",
    "isDaily": true,
    "baseScore": 83
  },

  // --- AFTERNOON / GO HOME (15:00 - 19:00) ---
  {
    "id": "seed-sore-1",
    "date": "",
    "day": "All",
    "time_window": "Sore",
    "predicted_hour": "15:30",
    "origin": "Pasar Baru / Pusat Perbelanjaan",
    "type": "Bike",
    "category": "Mall/Lifestyle",
    "lat": -6.9180,
    "lng": 107.6090,
    "zone": "Pasar Baru",
    "notes": "Pembeli pulang bawa belanjaan berat. Orderan jarak pendek-menengah.",
    "isDaily": true,
    "baseScore": 80
  },
  {
    "id": "seed-sore-2",
    "date": "",
    "day": "Jumat",
    "time_window": "Sore",
    "predicted_hour": "16:30",
    "origin": "Kampus ITB / Unpad Dipatiukur",
    "type": "Bike",
    "category": "Education",
    "lat": -6.8910,
    "lng": 107.6100,
    "zone": "Dago",
    "notes": "Mahasiswa pulang kampung/weekend. Orderan ke Travel/Stasiun. Sniper spot!",
    "isDaily": false,
    "baseScore": 92
  },
  {
    "id": "seed-sore-3",
    "date": "",
    "day": "All",
    "time_window": "Sore",
    "predicted_hour": "16:45",
    "origin": "Stasiun Bandung (Pintu Utara)",
    "type": "Bike",
    "category": "Transport Hub",
    "lat": -6.9126,
    "lng": 107.6024,
    "zone": "Kebon Kawung",
    "notes": "Kereta sore tiba. Penumpang eksekutif pulang ke rumah. Peak 16:30-18:00.",
    "isDaily": true,
    "baseScore": 94
  },
  {
    "id": "seed-sore-4",
    "date": "",
    "day": "All",
    "time_window": "Sore",
    "predicted_hour": "17:00",
    "origin": "Trans Studio Mall (TSM)",
    "type": "Bike",
    "category": "Mall/Lifestyle",
    "lat": -6.9250,
    "lng": 107.6360,
    "zone": "Gatot Subroto",
    "notes": "Bubaran SPG mall dan pengunjung sore.",
    "isDaily": true,
    "baseScore": 85
  },
  {
    "id": "seed-sore-5",
    "date": "",
    "day": "All",
    "time_window": "Sore",
    "predicted_hour": "17:30",
    "origin": "Komplek Perumahan Pasteur / Surya Sumantri",
    "type": "Bike",
    "category": "Residential",
    "lat": -6.8920,
    "lng": 107.5770,
    "zone": "Pasteur",
    "notes": "Traffic jam parah! Orderan pendek tapi beruntun. Cocok Feeder.",
    "isDaily": true,
    "baseScore": 89
  },
  {
    "id": "seed-sore-6",
    "date": "",
    "day": "All",
    "time_window": "Sore",
    "predicted_hour": "18:00",
    "origin": "Terminal Leuwi Panjang",
    "type": "Bike",
    "category": "Transport Hub",
    "lat": -6.9450,
    "lng": 107.5780,
    "zone": "Leuwi Panjang",
    "notes": "Bus sore datang dari Jakarta/Luar Kota. Penumpang lanjut ojol.",
    "isDaily": true,
    "baseScore": 87
  },

  // --- NIGHT / DINNER (19:00 - 23:00) ---
  {
    "id": "seed-malam-1",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "19:00",
    "origin": "Paskal Food Market / Hypersquare",
    "type": "Food",
    "category": "Culinary Night",
    "lat": -6.9030,
    "lng": 107.6180,
    "zone": "Paskal",
    "notes": "Kuliner malam rame. Orderan food melimpah 19:00-22:00.",
    "isDaily": true,
    "baseScore": 91
  },
  {
    "id": "seed-malam-2",
    "date": "",
    "day": "Sabtu",
    "time_window": "Malam",
    "predicted_hour": "19:30",
    "origin": "Jalan Braga / Asia Afrika",
    "type": "Bike",
    "category": "Mall/Lifestyle",
    "lat": -6.9175,
    "lng": 107.6095,
    "zone": "Braga",
    "notes": "Malam minggu! Macet total. Banyak orderan pendek tapi harga premium.",
    "isDaily": false,
    "baseScore": 95
  },
  {
    "id": "seed-malam-3",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "20:00",
    "origin": "Sudirman Street Food / Cibadak",
    "type": "Food",
    "category": "Culinary Night",
    "lat": -6.9220,
    "lng": 107.5980,
    "zone": "Sudirman",
    "notes": "Pusat kuliner malam legendaris. Orderan Food/Martabak/Batagor.",
    "isDaily": true,
    "baseScore": 90
  },
  {
    "id": "seed-malam-4",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "21:00",
    "origin": "Dago Atas / Villa Kafe",
    "type": "Bike",
    "category": "Culinary Night",
    "lat": -6.8580,
    "lng": 107.6050,
    "zone": "Dago Atas",
    "notes": "Cafe nongkrong malam. Orderan jarak jauh, cocok Sniper!",
    "isDaily": true,
    "baseScore": 85
  },
  {
    "id": "seed-malam-5",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "22:00",
    "origin": "RS Borromeus / Advent",
    "type": "Bike",
    "category": "Health/Emergency",
    "lat": -6.9050,
    "lng": 107.6100,
    "zone": "Pusat Kota",
    "notes": "Emergency & jaga malam RS. Orderan mendadak keluarga pasien.",
    "isDaily": true,
    "baseScore": 78
  },
  
  // --- LATE NIGHT SNIPER (23:00 - 02:00) ---
  {
    "id": "seed-late-night-1",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "23:30",
    "origin": "Stasiun Bandung (24 Jam)",
    "type": "Bike",
    "category": "Transport Hub",
    "lat": -6.9126,
    "lng": 107.6024,
    "zone": "Kebon Kawung",
    "notes": "Kereta malam tiba. Penumpang butuh pulang. Orderan jarak jauh premium!",
    "isDaily": true,
    "baseScore": 88
  },
  {
    "id": "seed-late-night-2",
    "date": "",
    "day": "All",
    "time_window": "Malam",
    "predicted_hour": "00:30",
    "origin": "24 Jam Convenience (Alfamart/Indomaret)",
    "type": "Bike Delivery",
    "category": "Market",
    "lat": -6.9000,
    "lng": 107.6100,
    "zone": "Central",
    "notes": "Orderan tengah malam: rokok, susu, snack. Jarak pendek-menengah.",
    "isDaily": true,
    "baseScore": 72
  },
  
  // --- WEEKEND SPECIAL ---
  {
    "id": "seed-minggu-1",
    "date": "",
    "day": "Minggu",
    "time_window": "Pagi",
    "predicted_hour": "07:00",
    "origin": "Gasibu / Gedung Sate (CFD)",
    "type": "Bike",
    "category": "Service/Hangout",
    "lat": -6.9020,
    "lng": 107.6190,
    "zone": "Gasibu",
    "notes": "Car Free Day! Olahraga pagi & kuliner. Ramai jemputan.",
    "isDaily": false,
    "baseScore": 95
  },
  {
    "id": "seed-minggu-2",
    "date": "",
    "day": "Minggu",
    "time_window": "Pagi",
    "predicted_hour": "08:00",
    "origin": "Dago Car Free Day",
    "type": "Bike",
    "category": "Service/Hangout",
    "lat": -6.8800,
    "lng": 107.6120,
    "zone": "Dago",
    "notes": "CFD Dago. Kuliner pagi & jemputan wisatawan.",
    "isDaily": false,
    "baseScore": 90
  },
  {
    "id": "seed-minggu-3",
    "date": "",
    "day": "Minggu",
    "time_window": "Siang",
    "predicted_hour": "13:00",
    "origin": "PVJ Mall / Ciwalk",
    "type": "Bike",
    "category": "Mall/Lifestyle",
    "lat": -6.8900,
    "lng": 107.5950,
    "zone": "Sukajadi",
    "notes": "Weekend mall. Wisatawan Jakarta belanja. Sniper spot jarak jauh!",
    "isDaily": false,
    "baseScore": 92
  },
  {
    "id": "seed-sabtu-1",
    "date": "",
    "day": "Sabtu",
    "time_window": "Sore",
    "predicted_hour": "17:00",
    "origin": "Cihampelas Walk (CW)",
    "type": "Bike",
    "category": "Mall/Lifestyle",
    "lat": -6.8960,
    "lng": 107.6070,
    "zone": "Cihampelas",
    "notes": "Weekend dimulai! Remaja hangout, orderan ke rumah makan.",
    "isDaily": false,
    "baseScore": 88
  }
];

export const DAYS_INDONESIA = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

// BANDUNG TRAFFIC INTELLIGENCE: Zona Macet & Kondisi
export const TRAFFIC_ZONES = {
  // Zona Super Macet (16:00-19:00)
  HEAVY: ['Pasteur', 'Gatot Subroto', 'Soekarno Hatta', 'Cibiru', 'Kopo', 'Buah Batu'],
  // Zona Lancar (Flow Bagus)
  SMOOTH: ['Dago Atas', 'Lembang', 'Cihampelas', 'Setiabudhi'],
  // Zona One Way System (Hati-hati)
  ONE_WAY: ['Braga', 'Asia Afrika', 'Dalem Kaum'],
  // Zona Surge Pricing (Harga Premium)
  SURGE: ['Stasiun Bandung', 'Terminal', 'Mall', 'Bandara Husein']
};

// WEATHER-BASED SHELTER ZONES (Tempat Teduh saat Hujan)
export const RAIN_SAFE_ZONES = [
  { name: 'Trans Studio Mall', zone: 'Gatot Subroto', lat: -6.9250, lng: 107.6360 },
  { name: 'Paris Van Java (PVJ)', zone: 'Sukajadi', lat: -6.8900, lng: 107.5950 },
  { name: '23 Paskal Shopping Center', zone: 'Paskal', lat: -6.9030, lng: 107.6180 },
  { name: 'Istana Plaza / BIP', zone: 'Pusat Kota', lat: -6.9140, lng: 107.6050 },
  { name: 'Cihampelas Walk', zone: 'Cihampelas', lat: -6.8960, lng: 107.6070 },
  { name: 'Festival Citylink', zone: 'Pasir Kaliki', lat: -6.9100, lng: 107.6050 }
];

// FUEL EFFICIENCY CONSTANTS
export const FUEL_CONSTANTS = {
  AVG_KM_PER_LITER: 35, // Rata-rata motor matic Bandung (naik turun)
  TANK_CAPACITY: 4.2, // Liter (Matic standard)
  FUEL_PRICE_PER_LITER: 10000, // Pertalite
  LOW_FUEL_THRESHOLD: 25, // % Warning
  CRITICAL_FUEL_THRESHOLD: 15 // % Critical
};

// PRAYER TIMES BANDUNG (Approximation - Dynamic per hari ideal pakai API)
export const PRAYER_TIMES_BANDUNG = {
  SUBUH: { start: '04:30', end: '05:45' },
  DZUHUR: { start: '11:45', end: '12:45' },
  ASHAR: { start: '15:00', end: '16:00' },
  MAGHRIB: { start: '17:45', end: '18:30' },
  ISYA: { start: '19:00', end: '20:00' }
};

export const CATEGORY_COLORS: Record<string, string> = {
  // 🔴 Food/Culinary: Red
  'Culinary': '#FF5252', 
  'Culinary Night': '#D32F2F',

  // 🔵 Bike/Passenger: Cyan
  'Bike': '#18FFFF', 
  'Bike Delivery': '#00E5FF',

  // 🟢 Logistics: Neon Green
  'Logistics': '#69F0AE',

  // 🟡 Money/Profit/Commercial: Gold
  'Commercial': '#FFD740',
  'Market': '#FFC107',
  'Mall/Lifestyle': '#FFAB00',
  
  // Others
  'Residential': '#FF6E40', // Deep Orange
  'Residential/Shop': '#FF9E80',
  'Education': '#7C4DFF', // Deep Purple
  'Education/Office': '#651FFF',
  'Health': '#00E676', // Green
  'Health/Office': '#00C853',
  'Health/Emergency': '#00B8D4',
  'Industrial/Office': '#B0BEC5',
  'Service': '#90A4AE',
  'Service/Hangout': '#78909C',
  'Gov/Facility': '#607D8B',
  'Transport Hub': '#40C4FF',
  'Other': '#EEEEEE'
};
