import React, { useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { getGarageData } from '../services/storage';

const SOSButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSOS = () => {
    const garage = getGarageData();
    if (!garage.emergencyContact) {
        alert("Nomor Darurat belum diset! Silakan atur di menu Garasi/Akun.");
        return;
    }

    setLoading(true);

    // QC Requirement: Fail safe fast. If GPS hangs > 2.5s, send without location.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
                const message = `TOLONG! Saya dalam kondisi darurat. Lokasi terakhir saya: ${mapsLink}`;
                sendWhatsApp(garage.emergencyContact, message);
                setLoading(false);
            },
            (err) => {
                // GPS Failed immediately
                const message = `TOLONG! Saya dalam kondisi darurat. (GPS Error)`;
                sendWhatsApp(garage.emergencyContact, message);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 2500 } // Reduced timeout to 2.5s
        );
    } else {
        const message = `TOLONG! Saya dalam kondisi darurat. (No GPS Device)`;
        sendWhatsApp(garage.emergencyContact, message);
        setLoading(false);
    }
  };

  const sendWhatsApp = (contact: string, message: string) => {
      let phone = contact.replace(/\D/g,'');
      if (phone.startsWith('0')) phone = '62' + phone.slice(1);
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
  }

  return (
    <button
        onClick={handleSOS}
        className={`fixed top-4 right-4 z-[1000] flex items-center justify-center w-12 h-12 rounded-full shadow-lg shadow-red-900/50 border-2 border-red-500 bg-red-600 text-white transition-transform active:scale-90 ${loading ? 'opacity-70 cursor-wait' : 'animate-pulse hover:bg-red-500'}`}
        title="TOMBOL SOS DARURAT"
    >
        {loading ? <AlertTriangle size={24} className="animate-spin" /> : <Bell size={24} />}
    </button>
  );
};

export default SOSButton;