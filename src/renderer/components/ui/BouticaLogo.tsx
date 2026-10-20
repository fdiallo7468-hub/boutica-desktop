import React from 'react';

interface BouticaLogoProps {
  variant?: 'mark' | 'full' | 'app-icon';
  color?: 'brand' | 'white' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Logo officiel Boutica avec fond rouge (#9A050E) et monogramme blanc
const LOGO_RED_SRC = '/assets/aistudio/logo-red.png';

export const BouticaLogo: React.FC<BouticaLogoProps> = ({
  variant = 'mark',
  color = 'brand',
  size = 'md',
  className = '',
}) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { imgSize: 22, containerSize: 28, rounded: 'rounded-[8px]', textScale: 'text-base', subScale: 'text-[9px]' };
      case 'lg':
        return { imgSize: 52, containerSize: 68, rounded: 'rounded-[18px]', textScale: 'text-2xl', subScale: 'text-xs' };
      case 'xl':
        return { imgSize: 72, containerSize: 92, rounded: 'rounded-[22px]', textScale: 'text-4xl', subScale: 'text-sm' };
      case 'md':
      default:
        return { imgSize: 32, containerSize: 42, rounded: 'rounded-[12px]', textScale: 'text-lg', subScale: 'text-[10px]' };
    }
  };

  const { imgSize, containerSize, rounded, textScale, subScale } = getDimensions();

  // Monogramme "B" sur fond rouge de marque
  const LogoBadge = (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-[#9A050E] ${rounded} shadow-xs select-none`}
      style={{ width: imgSize, height: imgSize }}
    >
      <img
        src={LOGO_RED_SRC}
        alt="Boutica"
        className="w-full h-full object-cover select-none pointer-events-none"
      />
    </div>
  );

  // Variante grande icône d'application (ex: écran de connexion)
  if (variant === 'app-icon') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-[#9A050E] to-[#7B030A] ${rounded} shadow-[0_8px_20px_rgba(154,5,14,0.28)] p-1 select-none transition-transform ${className}`}
        style={{ width: containerSize, height: containerSize }}
      >
        <img
          src={LOGO_RED_SRC}
          alt="Boutica Icon"
          className="w-full h-full object-cover select-none pointer-events-none rounded-[14px]"
        />
      </div>
    );
  }

  // Variante complète : badge rouge + texte BOUTICA
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {LogoBadge}
        <div className="flex flex-col justify-center leading-tight">
          <span
            className={`font-black tracking-tight uppercase ${textScale}`}
            style={{ color: color === 'white' ? '#FFFFFF' : '#2B282C' }}
          >
            BOUTICA
          </span>
          <span
            className={`font-medium tracking-normal ${subScale}`}
            style={{ color: color === 'white' ? 'rgba(255,255,255,0.75)' : '#706C70' }}
          >
            Gestion commerciale
          </span>
        </div>
      </div>
    );
  }

  // Variante 'mark' (icône seule)
  return <div className={`inline-flex items-center justify-center ${className}`}>{LogoBadge}</div>;
};
