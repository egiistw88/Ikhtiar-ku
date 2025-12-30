export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  required: (value: any): ValidationResult => {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      error: isValid ? undefined : 'Field ini wajib diisi'
    };
  },

  minValue: (min: number) => (value: number): ValidationResult => {
    const isValid = value >= min;
    return {
      isValid,
      error: isValid ? undefined : `Nilai minimal adalah ${min}`
    };
  },

  maxValue: (max: number) => (value: number): ValidationResult => {
    const isValid = value <= max;
    return {
      isValid,
      error: isValid ? undefined : `Nilai maksimal adalah ${max}`
    };
  },

  minLength: (min: number) => (value: string): ValidationResult => {
    const isValid = value.length >= min;
    return {
      isValid,
      error: isValid ? undefined : `Minimal ${min} karakter`
    };
  },

  maxLength: (max: number) => (value: string): ValidationResult => {
    const isValid = value.length <= max;
    return {
      isValid,
      error: isValid ? undefined : `Maksimal ${max} karakter`
    };
  },

  phoneNumber: (value: string): ValidationResult => {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    const isValid = phoneRegex.test(value.replace(/[\s-]/g, ''));
    return {
      isValid,
      error: isValid ? undefined : 'Format nomor telepon tidak valid'
    };
  },

  plateNumber: (value: string): ValidationResult => {
    const plateRegex = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/i;
    const isValid = plateRegex.test(value);
    return {
      isValid,
      error: isValid ? undefined : 'Format plat nomor tidak valid (contoh: B 1234 XYZ)'
    };
  },

  positiveNumber: (value: number): ValidationResult => {
    const isValid = value > 0;
    return {
      isValid,
      error: isValid ? undefined : 'Nilai harus lebih dari 0'
    };
  },

  percentage: (value: number): ValidationResult => {
    const isValid = value >= 0 && value <= 100;
    return {
      isValid,
      error: isValid ? undefined : 'Nilai harus antara 0-100'
    };
  },

  futureDate: (value: string): ValidationResult => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isValid = date >= today;
    return {
      isValid,
      error: isValid ? undefined : 'Tanggal tidak boleh di masa lalu'
    };
  }
};

export const combineValidators = (...validators: Array<(value: any) => ValidationResult>) => {
  return (value: any): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  };
};
