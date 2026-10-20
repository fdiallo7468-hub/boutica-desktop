import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#9A050E] text-white hover:bg-[#AA3035] active:bg-[#5F0203] shadow-sm disabled:bg-[#E5E2E3] disabled:text-[#706C70] disabled:cursor-not-allowed';
      case 'secondary':
        return 'bg-white border border-[#9A050E] text-[#9A050E] hover:bg-[#FCEAEC] active:bg-[#F9D5D8] disabled:border-[#E5E2E3] disabled:text-[#706C70] disabled:cursor-not-allowed';
      case 'tertiary':
        return 'bg-[#F7F6F6] text-[#2B282C] hover:bg-[#EAE8E9] active:bg-[#DDDADA] border border-[#E5E2E3] disabled:opacity-50 disabled:cursor-not-allowed';
      case 'danger':
        return 'bg-[#C62828] text-white hover:bg-[#B71C1C] active:bg-[#8E0000] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
      case 'ghost':
        return 'bg-transparent text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6] active:bg-[#EAE8E9] disabled:opacity-40 disabled:cursor-not-allowed';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-3 text-xs gap-1.5 rounded-[10px]';
      case 'lg':
        return 'h-12 px-6 text-base font-semibold gap-2.5 rounded-[12px]';
      case 'md':
      default:
        return 'h-10 px-4 text-sm font-medium gap-2 rounded-[12px]';
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A050E] focus-visible:ring-offset-2 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
