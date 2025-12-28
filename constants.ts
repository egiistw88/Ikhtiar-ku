
import { Hotspot } from './types';

// REVISI DATA: Menggunakan Logika "Archetype" (Pola)
// Tanggal dihapus/diabaikan untuk Seed Data. 
// Kita gunakan 'isDaily' untuk tempat yang ramai setiap hari.
// Kita gunakan 'day' spesifik untuk pola mingguan (misal: CFD di hari Minggu).

export const INITIAL_DATA: Hotspot[] = [
  // --- MORNING RUSH (05:00 - 09:00) ---
  {
    "id": "seed-morning-1",
    "date": "", // Irrelevant for seed
    "day": "Senin", // Spesifik Senin macet
    "time_window": "Pagi",
    "predicted_hour": "06:30",
    "origin": "Komplek Antapani (Terusan Jakarta)",
    "type": "Bike",
    "category": "Residential",
    "lat": -6.9120,
    "lng": 107.6600,
    "zone": "Antapani",
    "notes": "Traffic berangkat kerja sangat padat di hari Senin.",
    "isDaily": false,
    "baseScore": 90
  },
  {
    "id": "seed-morning-2",
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
    "notes": "Antar anak sekolah. Spot pasti ramai jam segini.",
    "isDaily": true, // Sekolah buka tiap hari kerja (Logic filter nanti handle weekend)
    "baseScore": 85
  },
  {
    "id": "seed-morning-3",
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
    "notes": "Kedatangan kereta eksekutif pagi & karyawan luar kota.",
    "isDaily": true,
    "baseScore": 95
  },
  {
    "id": "seed-morning-market",
    "date": "",
    "day": "All",
    "time_window": "Dini Hari",
    "predicted_hour": "04:30",
    "origin": "Pasar Induk Caringin",
    "type": "Bike Delivery",
    "category": "Market",
    "lat": -6.9350,
    "lng": 107.5750,
    "zone": "Caringin",
    "notes": "Pusat logistik pasar. Orderan barang/belanjaan.",
    "isDaily": true,
    "baseScore": 80
  },

  // --- LUNCH RUSH (11:00 - 13:00) ---
  {
    "id": "seed-lunch-1",
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
    "notes": "Karyawan bank/kantor pesen Gofood.",
    "isDaily": true,
    "baseScore": 88
  },
  {
    "id": "seed-lunch-2",
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
    "notes": "Antrian driver panjang = Orderan melimpah.",
    "isDaily": true,
    "baseScore": 92
  },

  // --- AFTERNOON / GO HOME (16:00 - 18:00) ---
  {
    "id": "seed-sore-1",
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
    "notes": "Mahasiswa pulang kampung/weekend. Orderan ke Travel/Stasiun.",
    "isDaily": false,
    "baseScore": 90
  },
  {
    "id": "seed-sore-2",
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
    "notes": "Bubaran SPG mall dan pengunjung.",
    "isDaily": true,
    "baseScore": 85
  },

  // --- NIGHT / DINNER (19:00 - 22:00) ---
  {
    "id": "seed-malam-1",
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
    "notes": "Malam minggu macet total. Banyak orderan pendek tapi mahal.",
    "isDaily": false,
    "baseScore": 95
  },
  {
    "id": "seed-malam-2",
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
    "notes": "Pusat kuliner malam. Orderan Food/Martabak.",
    "isDaily": true,
    "baseScore": 88
  },
  
  // --- WEEKEND SPECIAL ---
  {
    "id": "seed-minggu-1",
    "date": "",
    "day": "Minggu",
    "time_window": "Pagi",
    "predicted_hour": "07:00",
    "origin": "Gasibu / Gedung Sate",
    "type": "Bike",
    "category": "Service/Hangout",
    "lat": -6.9020,
    "lng": 107.6190,
    "zone": "Gasibu",
    "notes": "Area Car Free Day / Olahraga. Ramai jemputan.",
    "isDaily": false,
    "baseScore": 95
  },
  {
    "id": "seed-minggu-2",
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
    "notes": "Wisatawan Jakarta belanja/main.",
    "isDaily": false,
    "baseScore": 90
  }
];

export const DAYS_INDONESIA = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

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
