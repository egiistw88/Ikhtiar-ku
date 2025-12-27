import React from 'react';
import { AlertTriangle, CheckCircle2, X, Info } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'info';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const CustomDialog: React.FC<CustomDialogProps> = ({ 
  isOpen, 
  type, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Oke",
  cancelText = "Batal"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* Icon Header */}
        <div className="flex justify-center mb-4">
            {type === 'confirm' && (
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center border border-red-500/30">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>
            )}
            {type === 'alert' && (
                 <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center border border-amber-500/30">
                    <AlertTriangle size={32} className="text-amber-500" />
                </div>
            )}
            {type === 'info' && (
                 <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <Info size={32} className="text-emerald-500" />
                </div>
            )}
        </div>

        {/* Content */}
        <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
            {type === 'confirm' && onCancel && (
                <button 
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-bold hover:bg-gray-800 transition-colors"
                >
                    {cancelText}
                </button>
            )}
            <button 
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-xl font-bold text-black transition-transform active:scale-95 ${type === 'confirm' ? 'bg-red-500 hover:bg-red-400' : 'bg-app-primary hover:bg-yellow-400'}`}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CustomDialog;