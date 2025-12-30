import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'solid';
  interactive?: boolean;
  glowColor?: 'primary' | 'success' | 'danger' | 'none';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  interactive = false,
  glowColor = 'none'
}) => {
  const baseStyles = 'rounded-2xl overflow-hidden';

  const variantStyles = {
    default: 'bg-[#1a1a1a] border border-gray-800',
    glass: 'glass-panel',
    solid: 'bg-black border border-gray-900'
  };

  const interactiveStyles = interactive
    ? 'transition-all active:scale-[0.99] hover:border-gray-700 cursor-pointer'
    : '';

  const glowStyles = {
    primary: 'shadow-[0_0_15px_rgba(252,211,77,0.1)]',
    success: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    danger: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    none: ''
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${glowStyles[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
