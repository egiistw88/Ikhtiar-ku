# UI Components

Koleksi komponen UI yang dapat digunakan kembali untuk aplikasi Ikhtiar-Ku.

## Komponen yang Tersedia

### Button

Komponen button dengan berbagai varian dan ukuran.

```tsx
import { Button } from './components/ui';
import { Save } from 'lucide-react';

<Button 
  variant="primary" 
  size="md" 
  icon={Save}
  onClick={() => console.log('Clicked')}
>
  Simpan
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
- `size`: 'sm' | 'md' | 'lg'
- `icon`: LucideIcon component
- `iconPosition`: 'left' | 'right'
- `loading`: boolean
- `fullWidth`: boolean

### Card

Komponen card dengan glassmorphism effect.

```tsx
import { Card } from './components/ui';

<Card variant="glass" glowColor="primary">
  <div className="p-4">
    Card content here
  </div>
</Card>
```

**Props:**
- `variant`: 'default' | 'glass' | 'solid'
- `interactive`: boolean - Adds hover effects
- `glowColor`: 'primary' | 'success' | 'danger' | 'none'

### Input

Input field dengan validation states dan icons.

```tsx
import { Input } from './components/ui';
import { Mail } from 'lucide-react';

<Input
  label="Email"
  type="email"
  icon={Mail}
  placeholder="nama@email.com"
  error="Email tidak valid"
  helperText="Gunakan email aktif"
/>
```

**Props:**
- `label`: string
- `error`: string - Error message
- `success`: string - Success message
- `icon`: LucideIcon
- `helperText`: string

### Modal

Modal dialog dengan focus trap dan keyboard support.

```tsx
import { Modal } from './components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Konfirmasi"
  description="Apakah Anda yakin?"
  size="md"
>
  <div>Modal content</div>
</Modal>
```

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `description`: string
- `size`: 'sm' | 'md' | 'lg'
- `showCloseButton`: boolean
- `closeOnOverlayClick`: boolean

**Accessibility:**
- Auto-focus pada elemen pertama
- Focus trap dalam modal
- Escape key untuk menutup
- Restore focus saat ditutup

### LoadingSpinner

Indikator loading dengan optional text.

```tsx
import { LoadingSpinner } from './components/ui';

<LoadingSpinner size="md" text="Memuat data..." />

// Full screen loading
<LoadingSpinner size="lg" text="Mohon tunggu..." fullScreen />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `text`: string
- `fullScreen`: boolean

### Toast

Notifikasi toast dengan auto-dismiss.

```tsx
import { Toast } from './components/ui';

<Toast
  message="Data berhasil disimpan!"
  type="success"
  duration={3000}
  onClose={() => setToast(null)}
/>
```

**Props:**
- `message`: string
- `type`: 'success' | 'error' | 'info'
- `duration`: number (ms, 0 = no auto-dismiss)
- `onClose`: () => void
- `showCloseButton`: boolean

## Best Practices

### Accessibility
- Selalu gunakan `aria-label` untuk icon-only buttons
- Sediakan `label` untuk input fields
- Gunakan semantic HTML
- Test dengan keyboard navigation

### Performance
- Import hanya komponen yang dibutuhkan
- Gunakan `React.memo` untuk komponen yang re-render sering
- Lazy load komponen berat

### Styling
- Extend dengan Tailwind classes via `className` prop
- Jangan override internal styles dengan `!important`
- Gunakan CSS variables untuk theming

### Error Handling
- Validate props dengan TypeScript
- Provide fallback UI untuk error states
- Log errors di development mode

## Contoh Penggunaan Lengkap

```tsx
import React, { useState } from 'react';
import { Button, Card, Input, Modal, Toast } from './components/ui';
import { Save, X } from 'lucide-react';

function MyForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email) {
      setError('Email wajib diisi');
      return;
    }
    
    // Process...
    setToast({ message: 'Berhasil disimpan!', type: 'success' });
    setIsOpen(false);
  };

  return (
    <>
      <Card variant="glass" glowColor="primary">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Formulir Contoh</h2>
          
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="nama@email.com"
          />

          <Button
            variant="primary"
            fullWidth
            icon={Save}
            onClick={() => setIsOpen(true)}
          >
            Simpan
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Konfirmasi"
        description="Apakah data sudah benar?"
      >
        <div className="space-y-4">
          <p>Email: {email}</p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSubmit} fullWidth>
              Ya, Simpan
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)} fullWidth>
              Batal
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
```

## Custom Hooks

### useToast

Hook untuk mengelola toast notifications.

```tsx
import { useToast } from '../hooks';

function MyComponent() {
  const { showToast, ToastComponent } = useToast();

  const handleSuccess = () => {
    showToast({
      message: 'Operasi berhasil!',
      type: 'success',
      duration: 3000
    });
  };

  return (
    <>
      <button onClick={handleSuccess}>Show Toast</button>
      {ToastComponent}
    </>
  );
}
```

## Theming

Komponen menggunakan CSS variables dari Tailwind config di `index.html`:

```js
colors: {
  app: {
    bg: '#000000',
    card: '#111111',
    border: '#333333',
    primary: '#FCD34D',
    accent: '#10B981',
    danger: '#EF4444',
    text: '#E5E7EB',
    muted: '#9CA3AF'
  }
}
```

Untuk custom theme, override di Tailwind config atau inline styles.
