# 🚀 Ikhtiar-Ku: Radar Rezeki Driver Ojol

> Aplikasi wajib Driver Ojol Indonesia. Radar Rezeki, Dompet Berkah, dan Perisai Driver.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](https://www.pwabuilder.com/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Offline](https://img.shields.io/badge/Offline-Supported-orange.svg)](https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook)

## ✨ Fitur Utama

### 📡 Radar Rezeki
- **Prediksi Hotspot Cerdas** dengan algoritma scoring dinamis
- **Dua Mode Strategi**: FEEDER (kuantitas) & SNIPER (kualitas)
- **Golden Time Alert** berdasarkan waktu dan strategi
- **Momentum Tracker** untuk memantau performa akun
- **Rain Mode** untuk optimasi saat hujan
- **AI Strategy Advisor** powered by Google GenAI

### 💰 Dompet Berkah
- **Tracking Keuangan Lengkap**: Income vs Expense
- **Cash vs Non-Cash Separation** untuk akuntansi akurat
- **Quick Actions** untuk pencatatan cepat
- **Target Revenue Tracker** dengan forecast pintar
- **Financial Advisor** untuk rekomendasi pengeluaran

### 🛡️ Perisai Driver
- **Maintenance Tracker**: Oli, ban, v-belt dengan reminder otomatis
- **Legal Docs Monitor**: STNK & SIM expiry alerts
- **Emergency Contact**: Quick access untuk kontak darurat
- **Odometer Auto-Update** dari jarak trip

### 📝 Journal & Map
- **Voice-Enabled Logging** untuk input hands-free
- **GPS-Aware** untuk auto-capture lokasi
- **Create Hotspot from Trip** untuk personalisasi
- **Interactive Map** dengan tactical advice panels

### ⚙️ Settings & Backup
- **Data Export/Import** untuk backup dan restore
- **Factory Reset** dengan konfirmasi
- **Custom Target Revenue**
- **Filter Preferences** (Food, Bike, Send, Shop)

## 🎯 Keunggulan

### 🔒 Privacy First
- **100% Local Storage** - Data Anda tetap di device Anda
- **No Account Required** - Langsung pakai tanpa registrasi
- **Offline Full-Featured** - Semua fitur inti tanpa internet

### ⚡ Performance
- **Instant Load** dengan Service Worker caching
- **Lightweight** - Optimized bundle size
- **Smooth Animations** dengan hardware acceleration
- **Battery Efficient** dengan smart polling

### ♿ Accessible & Responsive
- **ARIA Labels** untuk screen readers
- **Keyboard Navigation** support
- **Touch Optimized** untuk mobile
- **Works on Any Screen Size**

## 🛠️ Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.6
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4 (JIT)
- **Icons**: Lucide React
- **Maps**: Leaflet + React-Leaflet
- **AI**: Google GenAI API
- **Storage**: localStorage with IndexedDB fallback plan
- **PWA**: Custom Service Worker with offline support

## 📦 Installation & Development

### Prerequisites
- Node.js 18+ 
- npm atau yarn

### Setup

```bash
# Clone repository
git clone <repository-url>
cd ikhtiar-ku

# Install dependencies
npm install

# Set up environment variables (optional for AI features)
# Create .env.local and add:
# VITE_GEMINI_API_KEY=your_api_key_here

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🗂️ Project Structure

```
ikhtiar-ku/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Modal, etc.)
│   ├── shared/          # Shared components (ErrorBoundary)
│   ├── RadarView.tsx    # Main hotspot prediction
│   ├── MapView.tsx      # Interactive map
│   ├── JournalEntry.tsx # Trip logging
│   ├── WalletView.tsx   # Financial tracking
│   ├── GarageView.tsx   # Maintenance & safety
│   └── ...
├── services/
│   ├── storage.ts       # localStorage wrapper with validation
│   └── ai.ts            # Google GenAI integration
├── hooks/
│   ├── useToast.tsx     # Toast notification hook
│   ├── useLocalStorage.ts
│   └── useOnlineStatus.ts
├── utils/
│   ├── validation.ts    # Input validators
│   ├── errorHandling.ts # Error utilities
│   └── ...
├── public/
│   ├── sw.js           # Service Worker for PWA
│   ├── offline.html    # Offline fallback page
│   └── manifest.json   # PWA manifest
├── types.ts            # TypeScript interfaces
├── constants.ts        # Seed data & configurations
└── App.tsx            # Main app orchestrator
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output akan berada di folder `dist/`. Deploy ke:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop folder `dist/`
- **GitHub Pages**: Push ke `gh-pages` branch
- **Any Static Host**: Upload folder `dist/`

### PWA Installation

Setelah deploy, pengguna dapat:
1. Buka app di browser mobile
2. Klik "Add to Home Screen" dari menu browser
3. App akan terinstall seperti native app
4. Icon akan muncul di home screen

## 📱 Browser Support

- ✅ Chrome/Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Samsung Internet 14+
- ✅ Opera 76+

## 🔐 Data Privacy & Security

- **Semua data disimpan lokal** di localStorage browser Anda
- **Tidak ada tracking atau analytics**
- **Tidak ada server-side storage**
- **AI features bersifat opsional** dan hanya mengirim data sementara (tidak disimpan)
- **Backup/restore sepenuhnya di kontrol pengguna**

## 🐛 Known Issues & Roadmap

### Current Limitations
- AI Advisor memerlukan koneksi internet
- Map tiles memerlukan koneksi (sedang dikembangkan offline cache)
- Voice input tergantung browser support

### Upcoming Features
- [ ] IndexedDB migration untuk storage yang lebih robust
- [ ] Map tiles offline caching
- [ ] Export data ke PDF/Excel
- [ ] Multi-day analytics dashboard
- [ ] Push notifications untuk maintenance reminders
- [ ] Dark/Light mode toggle
- [ ] Multi-language support (English)

## 🤝 Contributing

Kontribusi sangat diterima! Silakan:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

[MIT License](LICENSE) - Feel free to use for personal or commercial projects.

## 💖 Support

Jika aplikasi ini membantu penghasilan Anda, consider:
- ⭐ Star repository ini
- 🐛 Report bugs di Issues
- 💡 Suggest features di Discussions
- 📢 Share ke sesama driver ojol

## 📞 Contact & Feedback

- **Issues**: [GitHub Issues](https://github.com/your-repo/ikhtiar-ku/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/ikhtiar-ku/discussions)

---

**Dibuat dengan ❤️ untuk para Driver Ojol Indonesia 🇮🇩**

*Semoga berkah dan lancar rezekinya!* 🤲
