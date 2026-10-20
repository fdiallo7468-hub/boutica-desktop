import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hoverEffect = false,
  selected = false,
  className = '',
  ...props
}) => {
  const getPaddingClass = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      case 'md':
      default:
        return 'p-4';
    }
  };

  return (
    <div
      {...props}
      className={`bg-white rounded-[14px] border transition-all duration-150 ${
        selected
          ? 'border-[#9A050E] ring-1 ring-[#9A050E]'
          : 'border-[#E5E2E3]'
      } ${
        hoverEffect
          ? 'hover:border-[#AA3035] hover:shadow-md cursor-pointer'
          : 'shadow-[0_2px_10px_rgba(43,40,44,0.05)]'
      } ${getPaddingClass()} ${className}`}
    >
      {children}
    </div>
  );
};
