import React from 'react';

export interface StockBadgeProps {
  quantity: number;
  lowStockThreshold?: number;
  className?: string;
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  quantity,
  lowStockThreshold = 5,
  className = '',
}) => {
  if (quantity <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FCEAEC] text-[#C62828] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#C62828]" />
        Rupture
      </span>
    );
  }

  if (quantity <= lowStockThreshold) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4DF] text-[#D99016] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#D99016]" />
        Stock faible ({quantity})
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF6EF] text-[#16804A] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#16804A]" />
      En stock ({quantity})
    </span>
  );
};
