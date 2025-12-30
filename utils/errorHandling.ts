export interface AppError {
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
}

export const createAppError = (
  message: string,
  userMessage: string,
  code?: string,
  details?: any
): AppError => ({
  message,
  userMessage,
  code,
  details
});

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'userMessage' in error) {
    return (error as AppError).userMessage;
  }

  return 'Terjadi kesalahan yang tidak diketahui';
};

export const logError = (error: unknown, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error);
  }
};

export const handleStorageError = (error: unknown): AppError => {
  const message = getErrorMessage(error);
  
  if (message.includes('QuotaExceeded') || message.includes('quota')) {
    return createAppError(
      message,
      'Penyimpanan penuh! Silakan hapus data lama atau lakukan backup.',
      'STORAGE_QUOTA_EXCEEDED'
    );
  }

  if (message.includes('localStorage')) {
    return createAppError(
      message,
      'Tidak dapat mengakses penyimpanan. Pastikan browser Anda tidak dalam mode private.',
      'STORAGE_ACCESS_DENIED'
    );
  }

  return createAppError(
    message,
    'Terjadi kesalahan saat menyimpan data',
    'STORAGE_ERROR'
  );
};

export const handleNetworkError = (error: unknown): AppError => {
  const message = getErrorMessage(error);
  
  if (message.includes('network') || message.includes('fetch')) {
    return createAppError(
      message,
      'Tidak ada koneksi internet. Beberapa fitur mungkin terbatas.',
      'NETWORK_ERROR'
    );
  }

  return createAppError(
    message,
    'Terjadi kesalahan koneksi',
    'UNKNOWN_NETWORK_ERROR'
  );
};
