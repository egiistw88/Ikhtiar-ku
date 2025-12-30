# Changelog

All notable changes to Ikhtiar-Ku will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-30

### Added - Major UX/Performance/Maintainability Overhaul

#### 🎨 UI Components (Reusable)
- **Button Component** with variants (primary, secondary, danger, ghost, success)
- **Card Component** with glassmorphism variants
- **Input Component** with validation states and icons
- **Modal Component** with focus trap and keyboard navigation
- **LoadingSpinner Component** with fullscreen option
- **Toast Component** with auto-dismiss and types (success, error, info)

#### 🛠️ Developer Experience
- **ErrorBoundary** for graceful error handling
- **Custom Hooks**: `useToast`, `useLocalStorage`, `useOnlineStatus`
- **Validation Utilities** for consistent input validation
- **Error Handling Utilities** with user-friendly messages
- **Barrel Exports** for cleaner imports

#### ⚡ PWA & Performance
- **Service Worker** with network-first caching strategy
- **Offline Page** with auto-reload when connection restored
- **Enhanced Manifest** with app shortcuts
- **Code Splitting** for React and Map vendors
- **Online/Offline Indicator** with visual feedback

#### ♿ Accessibility
- **ARIA Labels** on all interactive elements
- **Keyboard Navigation** support throughout app
- **Focus Management** in modals and dialogs
- **Semantic HTML** (nav, main, button roles)
- **Screen Reader** friendly structure

#### 📖 Documentation
- **Comprehensive README** with features, tech stack, deployment guide
- **CONTRIBUTING.md** with code style, testing, and PR guidelines
- **UI Components README** with usage examples
- **CHANGELOG.md** for tracking all changes

#### 🔧 Code Quality
- **Enhanced Validation** in storage operations (hotspots, transactions)
- **Better Error Messages** in Indonesian for user-facing errors
- **Type Safety** improvements across codebase
- **EditorConfig** for consistent code formatting
- **vite-env.d.ts** for proper TypeScript environment types

#### 📱 Mobile Optimization
- **Enhanced Meta Tags** for SEO and PWA
- **Apple Touch Icons** support
- **Theme Color** for mobile browsers
- **Better Viewport** configuration

### Improved

#### 🎯 User Experience
- **Toast Notifications** now use reusable component with types
- **Loading States** more consistent across app
- **Error Handling** shows user-friendly messages instead of crashes
- **Navigation** has proper ARIA labels and keyboard support

#### 🏗️ Code Structure
- Organized components into `/ui` and `/shared` folders
- Created `/hooks` folder for custom React hooks
- Added `/utils/validation.ts` and `/utils/errorHandling.ts`
- Better separation of concerns

#### 🚀 Performance
- Bundle split into react-vendor and map-vendor chunks
- Removed sourcemaps from production build
- Optimized Vite configuration

### Fixed
- TypeScript errors with `process.env` by adding @types/node
- Missing accessibility attributes on navigation elements
- Inconsistent error handling across components
- localStorage quota exceeded not properly handled

### Technical Details

**Dependencies Added:**
- `@types/node` (dev) - for Node.js type definitions

**New Files:**
```
components/ui/
  - Button.tsx
  - Card.tsx
  - Input.tsx
  - Modal.tsx
  - LoadingSpinner.tsx
  - Toast.tsx
  - index.ts
  - README.md

components/shared/
  - ErrorBoundary.tsx

hooks/
  - useToast.tsx
  - useLocalStorage.ts
  - useOnlineStatus.ts
  - index.ts

utils/
  - validation.ts
  - errorHandling.ts

public/
  - sw.js
  - offline.html

Root:
  - CONTRIBUTING.md
  - CHANGELOG.md
  - .editorconfig
  - vite-env.d.ts
```

**Modified Files:**
- `index.tsx` - Added ErrorBoundary and Service Worker registration
- `App.tsx` - Integrated Toast component, online/offline detection
- `manifest.json` - Enhanced with shortcuts and better descriptions
- `index.html` - Improved meta tags for SEO and PWA
- `vite.config.ts` - Added code splitting and optimization
- `services/storage.ts` - Added validation for transactions and hotspots
- `utils.ts` - Added formatCurrency, formatNumber, getRelativeTime
- `README.md` - Complete rewrite with comprehensive documentation
- `capacitor.config.ts` - Added ts-ignore for optional dependency

## [1.1.0] - 2024-XX-XX

### Added
- Two strategy modes: FEEDER and SNIPER
- Momentum tracking system
- Golden Time alerts based on strategy
- AI Strategy Advisor with Google GenAI
- Financial Advisor for expense recommendations
- Maintenance tracker with auto-reminders
- Rest Mode overlay
- Rain Mode for weather-aware predictions

### Improved
- Hotspot scoring algorithm with strategy awareness
- Financial calculations (cash vs non-cash separation)
- Garage data tracking (odometer, oil change, tire change)
- Data housekeeping with automatic cleanup

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Radar view with hotspot predictions
- Map view with Leaflet integration
- Journal entry with voice input
- Wallet view with income/expense tracking
- Garage view with maintenance tracking
- Settings with backup/restore
- Shift summary with analytics
- Pre-ride setup with modal check
- SOS button with WhatsApp integration
- Dark theme UI with glassmorphism
- localStorage-based data persistence
- Seed hotspot data for Bandung area

---

## Version Guidelines

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Versioning
- **MAJOR** (X.0.0) - Breaking changes, data migration needed
- **MINOR** (1.X.0) - New features, backward compatible
- **PATCH** (1.0.X) - Bug fixes, small improvements
