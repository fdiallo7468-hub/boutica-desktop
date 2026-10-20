import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LoadErrorProps {
  message: string;
  onRetry?: () => void;
}

/** Affiché quand le serveur n'a pas pu fournir les données : on n'invente jamais de données de remplacement. */
export const LoadError: React.FC<LoadErrorProps> = ({ message, onRetry }) => (
  <div className="p-3 rounded-[10px] bg-[#FCEAEC] border border-[#C62828]/20 flex items-start justify-between gap-3 text-xs text-[#C62828]">
    <div className="flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Chargement impossible</p>
        <p>{message}</p>
      </div>
    </div>
    {onRetry && (
      <button type="button" onClick={onRetry} className="flex items-center gap-1 font-semibold underline shrink-0">
        <RefreshCw className="w-3.5 h-3.5" />
        Réessayer
      </button>
    )}
  </div>
);

export function errorText(err: unknown, fallback = 'Erreur inattendue'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
