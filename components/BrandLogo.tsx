import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = "", withText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
      >
        {/* Outer Radar Ring - Pulsing */}
        <circle cx="50" cy="50" r="45" stroke="url(#paint0_linear)" strokeWidth="2" strokeOpacity="0.3">
            <animate attributeName="r" values="45;48;45" dur="3s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Middle Ring */}
        <circle cx="50" cy="50" r="35" stroke="url(#paint1_linear)" strokeWidth="2" strokeDasharray="10 5" strokeOpacity="0.6" />

        {/* The Core: Location Pin meets Arrow */}
        <path d="M50 20C38.9543 20 30 28.9543 30 40C30 55 50 80 50 80C50 80 70 55 70 40C70 28.9543 61.0457 20 50 20Z" fill="#064E3B" stroke="#10B981" strokeWidth="3"/>
        
        {/* The Spark/Signal inside */}
        <path d="M50 30V50M40 40L50 30L60 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
             <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
        </path>

        <defs>
          <linearGradient id="paint0_linear" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="paint1_linear" x1="50" y1="15" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
      
      {withText && (
        <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">
                IKHTIAR<span className="text-emerald-500">-KU</span>
            </h1>
            <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">
                Radar Rezeki
            </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;