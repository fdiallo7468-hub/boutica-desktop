import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm':
        return 'max-w-md';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'md':
      default:
        return 'max-w-lg';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${getMaxWidthClass()} bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_8px_28px_rgba(43,40,44,0.12)] overflow-hidden z-10 flex flex-col max-h-[92vh] sm:max-h-[88vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E2E3] bg-[#FDFDFD]">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-[#2B282C]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#706C70] mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la boîte de dialogue"
            className="p-1.5 rounded-full text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm text-[#2B282C]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end flex-wrap gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[#E5E2E3] bg-[#F7F6F6]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
