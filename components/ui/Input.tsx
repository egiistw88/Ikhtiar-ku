import React, { InputHTMLAttributes, useState } from 'react';
import { LucideIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  icon?: LucideIcon;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      icon: Icon,
      helperText,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Icon size={20} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full input-digital rounded-xl px-4 py-3 text-white
              ${Icon ? 'pl-12' : ''}
              ${error ? 'border-red-500 focus:border-red-500' : success ? 'border-emerald-500 focus:border-emerald-500' : 'border-white/10 focus:border-app-primary'}
              transition-colors
              ${className}
            `}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : success ? `${inputId}-success` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {(error || success) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {error && <AlertCircle size={20} className="text-red-500" />}
              {success && <CheckCircle size={20} className="text-emerald-500" />}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400 font-medium flex items-center gap-1" role="alert">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {success && !error && (
          <p id={`${inputId}-success`} className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle size={12} />
            {success}
          </p>
        )}
        {helperText && !error && !success && (
          <p id={`${inputId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
