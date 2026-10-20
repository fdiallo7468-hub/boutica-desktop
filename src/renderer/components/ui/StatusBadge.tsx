import React from 'react';

export interface StatusBadgeProps {
  status: 'COMPLETED' | 'DRAFT' | 'CANCELLED' | 'RECEIVED' | 'ACTIVE' | 'INACTIVE';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyles = () => {
    switch (status) {
      case 'COMPLETED':
      case 'RECEIVED':
      case 'ACTIVE':
        return {
          bg: 'bg-[#EAF6EF]',
          text: 'text-[#16804A]',
          dot: 'bg-[#16804A]',
          label: status === 'COMPLETED' ? 'Terminé' : status === 'RECEIVED' ? 'Reçu' : 'Actif',
        };
      case 'DRAFT':
        return {
          bg: 'bg-[#FFF4DF]',
          text: 'text-[#D99016]',
          dot: 'bg-[#D99016]',
          label: 'Brouillon',
        };
      case 'CANCELLED':
      case 'INACTIVE':
        return {
          bg: 'bg-[#FCEAEC]',
          text: 'text-[#C62828]',
          dot: 'bg-[#C62828]',
          label: status === 'CANCELLED' ? 'Annulé' : 'Inactif',
        };
      default:
        return {
          bg: 'bg-[#F7F6F6]',
          text: 'text-[#706C70]',
          dot: 'bg-[#706C70]',
          label: status,
        };
    }
  };

  const { bg, text, dot, label } = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
