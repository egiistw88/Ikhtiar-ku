import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';

interface SplashViewProps {
  onFinish: () => void;
}

const SplashView: React.FC<SplashViewProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // OPTIMASI SPEED: Driver tidak suka menunggu.
    // Durasi dipangkas total: 1.2 detik (Cukup untuk branding, tapi cepat)
    
    const timer = setTimeout(() => {
        setFade(true);
    }, 800); // Mulai fade out di 0.8s

    const finish = setTimeout(() => {
        onFinish();
    }, 1200); // Selesai total di 1.2s

    return () => {
        clearTimeout(timer);
        clearTimeout(finish);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center transition-opacity duration-300 ${fade ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-20 animate-pulse rounded-full"></div>
            <BrandLogo size={100} className="relative z-10 animate-[bounce_1s_infinite]" />
        </div>
        
        <div className="mt-6 text-center space-y-1 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <h1 className="text-3xl font-black text-white tracking-tighter">
                IKHTIAR<span className="text-emerald-500">-KU</span>
            </h1>
            <p className="text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase">
                Siap Jemput Rezeki
            </p>
        </div>
    </div>
  );
};

export default SplashView;