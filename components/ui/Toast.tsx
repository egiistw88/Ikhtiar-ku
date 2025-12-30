import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  showCloseButton?: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  showCloseButton = false
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-600/90',
      borderColor: 'border-emerald-400/30',
      iconBg: 'bg-white/20'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-600/90',
      borderColor: 'border-red-400/30',
      iconBg: 'bg-white/20'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-600/90',
      borderColor: 'border-blue-400/30',
      iconBg: 'bg-white/20'
    }
  };

  const { icon: Icon, bgColor, borderColor, iconBg } = config[type];

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[2000] ${bgColor} backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm border ${borderColor}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`${iconBg} p-1 rounded-full`}>
        <Icon size={18} className="text-white" />
      </div>
      <span className="font-bold text-sm leading-snug flex-1">{message}</span>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Toast;
