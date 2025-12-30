# Contributing to Ikhtiar-Ku

Terima kasih atas minat Anda untuk berkontribusi! 🙏

## 📋 Code of Conduct

- Bersikap hormat dan profesional
- Fokus pada konstruktif feedback
- Hindari spam dan konten tidak relevan
- Hormati privasi dan data pengguna

## 🚀 Getting Started

### Prerequisites

- Node.js 18 atau lebih tinggi
- npm atau yarn
- Git
- Code editor (VS Code recommended)

### Setup Development Environment

```bash
# Fork dan clone repository
git clone https://github.com/YOUR_USERNAME/ikhtiar-ku.git
cd ikhtiar-ku

# Install dependencies
npm install

# Create feature branch
git checkout -b feature/your-feature-name

# Start development server
npm run dev
```

## 🎯 How to Contribute

### Reporting Bugs

Gunakan template berikut saat melaporkan bug:

```markdown
**Deskripsi Bug:**
[Jelaskan bug secara detail]

**Langkah Reproduksi:**
1. Buka halaman...
2. Klik tombol...
3. Lihat error...

**Expected Behavior:**
[Apa yang seharusnya terjadi]

**Actual Behavior:**
[Apa yang sebenarnya terjadi]

**Screenshots:**
[Jika ada, lampirkan screenshot]

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Android 13, iOS 16]
- Device: [e.g., Samsung Galaxy S21]
```

### Suggesting Features

Untuk request fitur baru:

1. Cek dulu di [Issues](https://github.com/your-repo/ikhtiar-ku/issues) apakah sudah ada request serupa
2. Jelaskan **use case** dan **problem** yang ingin diselesaikan
3. Berikan contoh **mockup** atau **flow** jika memungkinkan
4. Diskusikan dampak pada **privacy** dan **offline functionality**

### Pull Requests

#### Process

1. **Create Issue** terlebih dahulu untuk diskusi
2. **Fork** repository dan create **feature branch**
3. **Implement** changes dengan mengikuti code style
4. **Test** secara menyeluruh (manual dan automated jika ada)
5. **Commit** dengan clear commit messages
6. **Push** ke fork Anda
7. **Create Pull Request** dengan detail description

#### PR Guidelines

✅ **DO:**
- Test di berbagai browser (Chrome, Safari, Firefox)
- Update documentation jika perlu
- Keep PR focused pada single feature/fix
- Write clear commit messages
- Add comments untuk logic yang kompleks
- Ensure code passes build (`npm run build`)

❌ **DON'T:**
- Submit breaking changes tanpa diskusi
- Mix multiple unrelated changes
- Include console.logs atau debug code
- Change code style/formatting di files yang tidak diubah
- Add external dependencies tanpa diskusi

## 💻 Code Style Guidelines

### TypeScript

```typescript
// ✅ Good
interface UserData {
  name: string;
  email: string;
  isActive: boolean;
}

const formatUserName = (user: UserData): string => {
  return user.name.trim().toUpperCase();
};

// ❌ Bad
const formatUserName = (user: any) => {
  return user.name.trim().toUpperCase();
};
```

### React Components

```tsx
// ✅ Good: Functional component dengan TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
      aria-label={label}
    >
      {label}
    </button>
  );
};

// ❌ Bad: Missing types, accessibility
const Button = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (`UserData`, `TransactionType`)
- **CSS Classes**: kebab-case (Tailwind utilities)

### File Organization

```
components/
  ├── ui/           # Reusable UI components
  │   ├── Button.tsx
  │   └── index.ts  # Barrel export
  ├── shared/       # Shared business components
  │   └── ErrorBoundary.tsx
  └── FeatureView.tsx # Feature-specific view

services/
  ├── storage.ts    # localStorage service
  └── ai.ts         # AI service

hooks/
  ├── useToast.tsx
  └── index.ts

utils/
  ├── validation.ts
  └── errorHandling.ts
```

## 🧪 Testing Guidelines

### Manual Testing Checklist

Sebelum submit PR, test:

- [ ] Functionality bekerja seperti expected
- [ ] UI responsive di mobile (375px), tablet (768px), desktop (1440px)
- [ ] Works di Chrome, Safari, Firefox
- [ ] Offline functionality tetap berfungsi
- [ ] No console errors atau warnings
- [ ] Data persists di localStorage dengan benar
- [ ] Loading states dan error states ditampilkan
- [ ] Accessibility: keyboard navigation, screen reader friendly

### Browser Testing

Minimal test di:
- Chrome/Edge (latest)
- Safari iOS (latest)
- Chrome Android (latest)

## 🎨 Design Guidelines

### UI Principles

1. **Mobile-First**: Design untuk mobile, enhance untuk desktop
2. **Dark Theme**: Semua UI menggunakan dark theme (#000000 background)
3. **Glassmorphism**: Gunakan backdrop-blur untuk depth
4. **High Contrast**: Pastikan text readable (WCAG AA minimum)
5. **Touch-Friendly**: Button minimal 44x44px untuk mobile
6. **Feedback**: Setiap action harus ada visual feedback

### Color Usage

```css
/* Primary Actions */
bg-app-primary (#FCD34D) - Main CTA, success states

/* Success/Money */
bg-emerald-500/600 (#10B981) - Income, positive metrics

/* Danger/Alert */
bg-red-500/600 (#EF4444) - Errors, destructive actions

/* Background Hierarchy */
bg-black (#000000) - Main background
bg-[#1a1a1a] - Cards, elevated surfaces
bg-gray-800 - Input fields, secondary surfaces
```

### Typography

```css
/* Headings */
font-black text-2xl - Page titles
font-bold text-lg - Section titles
font-medium text-sm - Body text

/* Special */
font-mono - Numbers, currency, stats (JetBrains Mono)
```

## 🔒 Privacy & Security Guidelines

### Data Handling

- **Never** send user data to external servers tanpa consent
- **Always** store sensitive data di localStorage (client-side only)
- **Encrypt** jika menyimpan data pribadi sensitif
- **Validate** semua input dari user
- **Sanitize** data sebelum render (XSS prevention)

### localStorage Best Practices

```typescript
// ✅ Good: Safe with validation
const saveData = (data: UserData) => {
  try {
    if (!data.email || !validateEmail(data.email)) {
      throw new Error('Invalid data');
    }
    localStorage.setItem('user', JSON.stringify(data));
  } catch (error) {
    handleStorageError(error);
  }
};

// ❌ Bad: No validation
const saveData = (data) => {
  localStorage.setItem('user', JSON.stringify(data));
};
```

## 📝 Commit Messages

Gunakan format conventional commits:

```bash
feat: add dark mode toggle
fix: resolve GPS accuracy issue
docs: update README installation steps
style: format code with prettier
refactor: simplify validation logic
perf: optimize hotspot scoring algorithm
test: add unit tests for currency formatter
chore: update dependencies
```

## 🚨 Important Notes

### Breaking Changes

Jika PR Anda mengubah:
- localStorage structure (migrasi diperlukan)
- Public API dari komponen
- Behavior yang existing users andalkan

**Wajib:**
1. Diskusikan di Issue terlebih dahulu
2. Provide migration path
3. Update documentation
4. Add deprecation warnings jika perlu

### Performance

- Hindari re-renders yang tidak perlu (gunakan `useMemo`, `useCallback`)
- Lazy load komponen berat (Map, Charts)
- Optimize images dan assets
- Code split jika menambah dependencies besar

### Offline-First

Semua fitur baru **MUST**:
- Bekerja tanpa koneksi internet
- Save data locally terlebih dahulu
- Sync ke cloud (if any) sebagai enhancement, bukan requirement

## 📚 Resources

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

## 🤝 Community

- **Discord**: [Coming Soon]
- **GitHub Discussions**: [Link]
- **Email**: [maintainer@email.com]

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Terima kasih telah berkontribusi! 🙏**

Setiap kontribusi, sekecil apapun, sangat berarti untuk para driver ojol di Indonesia. 🇮🇩
