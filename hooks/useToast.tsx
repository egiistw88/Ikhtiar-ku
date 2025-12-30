import { useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={hideToast}
    />
  ) : null;

  return {
    showToast,
    hideToast,
    ToastComponent
  };
};
