import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';

interface SplashViewProps {
  onFinish: () => void;
}

const SplashView: React.FC<SplashViewProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Sequence: 
    // 0s: Logo appears
    // 1.5s: Text Slide up
    // 2.5s: Fade out
    // 3s: Finish
    const timer = setTimeout(() => {
        setFade(true);
    }, 2500);

    const finish = setTimeout(() => {
        onFinish();
    }, 3000);

    return () => {
        clearTimeout(timer);
        clearTimeout(finish);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-20 animate-pulse rounded-full"></div>
            <BrandLogo size={120} className="relative z-10 animate-[bounce_3s_infinite]" />
        </div>
        
        <div className="mt-8 text-center space-y-2 animate-[slideUp_1s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
            <h1 className="text-4xl font-black text-white tracking-tighter">
                IKHTIAR<span className="text-emerald-500">-KU</span>
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-cyan-500 mx-auto rounded-full"></div>
            <p className="text-cyan-400 font-medium text-sm tracking-widest uppercase">
                Maksimalkan Ikhtiar, Jemput Rezeki
            </p>
        </div>

        <div className="absolute bottom-10 text-gray-600 text-xs font-mono">
            v1.0 • Perisai Driver Indonesia
        </div>

        <style>{`
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `}</style>
    </div>
  );
};

export default SplashView;