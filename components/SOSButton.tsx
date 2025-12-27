import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, GripHorizontal } from 'lucide-react';
import { getGarageData } from '../services/storage';
import CustomDialog from './CustomDialog';

const SOSButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  // Dialog State Configuration
  const [dialogConfig, setDialogConfig] = useState<{
      isOpen: boolean;
      type: 'confirm' | 'alert' | 'info';
      title: string;
      message: string;
      action?: () => void;
  }>({
      isOpen: false,
      type: 'alert',
      title: '',
      message: ''
  });

  // State posisi (x, y)
  // Default: Kanan Atas (mirip posisi awal)
  const [pos, setPos] = useState({ x: window.innerWidth - 70, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs untuk tracking gerakan
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    // Load posisi terakhir dari localStorage saat aplikasi dibuka
    const savedPos = localStorage.getItem('ikhtiar_ku_sos_pos');
    if (savedPos) {
        try {
            const parsed = JSON.parse(savedPos);
            // Validasi agar tidak di luar layar (misal ganti HP)
            const safeX = Math.min(Math.max(0, parsed.x), window.innerWidth - 60);
            const safeY = Math.min(Math.max(0, parsed.y), window.innerHeight - 60);
            setPos({ x: safeX, y: safeY });
        } catch (e) {
            // Ignore error
        }
    }
  }, []);

  const handleSOS = () => {
    // Jika tombol baru saja digeser, JANGAN trigger SOS
    if (hasMoved.current) {
        hasMoved.current = false;
        return;
    }

    const garage = getGarageData();
    if (!garage.emergencyContact) {
        setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Kontak Belum Diset',
            message: 'Silakan atur Nomor Darurat di menu Garasi/Akun terlebih dahulu.',
            action: undefined
        });
        return;
    }

    setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: '⚠️ DARURAT SOS',
        message: 'Kirim lokasi & sinyal bantuan ke kontak darurat sekarang?',
        action: () => executeSOS(garage.emergencyContact)
    });
  };

  const executeSOS = (contact: string) => {
    setLoading(true);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
                const message = `TOLONG! Saya dalam kondisi darurat. Lokasi terakhir saya: ${mapsLink}`;
                sendWhatsApp(contact, message);
                setLoading(false);
            },
            (err) => {
                const message = `TOLONG! Saya dalam kondisi darurat. (GPS Error)`;
                sendWhatsApp(contact, message);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 2500 }
        );
    } else {
        const message = `TOLONG! Saya dalam kondisi darurat. (No GPS Device)`;
        sendWhatsApp(contact, message);
        setLoading(false);
    }
  };

  const sendWhatsApp = (contact: string, message: string) => {
      let phone = contact.replace(/\D/g,'');
      if (phone.startsWith('0')) phone = '62' + phone.slice(1);
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
  }

  // === DRAG LOGIC ===

  const handleStart = (clientX: number, clientY: number) => {
      setIsDragging(true);
      hasMoved.current = false;
      dragStart.current = { x: clientX, y: clientY };
      initialPos.current = { ...pos };
  };

  const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;

      // Jika gerak lebih dari 5 pixel, anggap sebagai drag (bukan klik)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasMoved.current = true;
      }

      // Hitung posisi baru dengan batas layar (Boundary Check)
      const newX = Math.min(Math.max(0, initialPos.current.x + dx), window.innerWidth - 55);
      const newY = Math.min(Math.max(0, initialPos.current.y + dy), window.innerHeight - 55);

      setPos({ x: newX, y: newY });
  };

  const handleEnd = () => {
      setIsDragging(false);
      // Simpan posisi terakhir
      localStorage.setItem('ikhtiar_ku_sos_pos', JSON.stringify(pos));
  };

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  
  // Mouse Events (untuk testing di PC)
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  
  // Global event listener untuk mouse move/up diurus oleh window agar tidak lepas saat drag cepat
  useEffect(() => {
      const onWindowMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
      const onWindowMouseUp = () => handleEnd();

      if (isDragging) {
          window.addEventListener('mousemove', onWindowMouseMove);
          window.addEventListener('mouseup', onWindowMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', onWindowMouseMove);
          window.removeEventListener('mouseup', onWindowMouseUp);
      };
  }, [isDragging]);

  return (
    <>
        <CustomDialog 
            isOpen={dialogConfig.isOpen}
            type={dialogConfig.type}
            title={dialogConfig.title}
            message={dialogConfig.message}
            onConfirm={() => {
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                if (dialogConfig.action) dialogConfig.action();
            }}
            onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
            confirmText={dialogConfig.type === 'confirm' ? 'KIRIM SOS!' : 'Oke'}
            cancelText="Batal"
        />
        
        <div
            style={{ 
                left: pos.x, 
                top: pos.y,
                touchAction: 'none' // Mencegah scroll layar saat drag tombol
            }}
            className={`fixed z-[2000] flex flex-col items-center gap-1 transition-shadow ${isDragging ? 'opacity-80 scale-110' : ''}`}
        >
            {/* DRAG HANDLE VISUAL CUE */}
            {isDragging && (
                <div className="bg-white/20 px-2 py-0.5 rounded-full mb-1 animate-in fade-in">
                    <GripHorizontal size={12} className="text-white" />
                </div>
            )}

            <button
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={handleEnd}
                onMouseDown={onMouseDown}
                onClick={handleSOS}
                className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl shadow-red-900/60 border-4 border-red-500 bg-red-600 text-white active:scale-95 transition-transform ${loading ? 'opacity-70 cursor-wait' : isDragging ? 'cursor-grabbing' : 'animate-pulse hover:bg-red-500 cursor-grab'}`}
                title="GESER UNTUK PINDAH, KLIK UNTUK SOS"
            >
                {loading ? <AlertTriangle size={24} className="animate-spin" /> : <Bell size={24} fill="currentColor" />}
            </button>
            
            {/* Helper Text (Only shows when dragging starts or initially) */}
            {!hasMoved.current && !loading && (
                <span className="text-[8px] font-bold text-white/50 bg-black/40 px-1 rounded backdrop-blur-sm mt-1 pointer-events-none">
                    GESER
                </span>
            )}
        </div>
    </>
  );
};

export default SOSButton;