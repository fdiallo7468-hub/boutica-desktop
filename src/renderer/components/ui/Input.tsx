import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#2B282C]">
            {label}
            {props.required && <span className="text-[#9A050E] ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#706C70]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            {...props}
            className={`w-full bg-white text-[#2B282C] placeholder:text-[#9E9B9D] rounded-[10px] border transition-colors duration-150 h-10 px-3 text-sm focus:outline-none ${
              error
                ? 'border-[#C62828] focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828]'
                : 'border-[#E5E2E3] hover:border-[#D5D2D3] focus:border-[#9A050E] focus:ring-1 focus:ring-[#9A050E]'
            } ${leftIcon ? 'pl-9' : ''} ${rightIcon || error ? 'pr-9' : ''} disabled:bg-[#F7F6F6] disabled:text-[#706C70] disabled:cursor-not-allowed ${className}`}
          />
          {error ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#C62828]">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3 flex items-center text-[#706C70]">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#C62828] font-medium flex items-center gap-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#706C70]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
