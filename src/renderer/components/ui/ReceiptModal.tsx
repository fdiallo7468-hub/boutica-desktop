import React from 'react';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';
import { BouticaLogo } from './BouticaLogo.tsx';
import { formatMoney } from '../../lib/money.ts';
import { useUIStore } from '../../store/uiStore.ts';
import { toast } from 'sonner';

export const ReceiptModal: React.FC = () => {
  const { activeReceipt, closeReceipt, session } = useUIStore();

  if (!activeReceipt) return null;

  const handlePrint = async () => {
    const receiptElement = document.getElementById('printable-receipt');
    if (!window.bouticaDesktop?.printReceipt || !receiptElement) {
      window.print();
      return;
    }
    // Le reçu est imprimé dans une fenêtre isolée : on lui fournit les styles de l'application.
    let css = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        css += Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
      } catch {
        /* feuille externe (polices) inaccessible : ignorée */
      }
    }
    const html =
      '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>' +
      css +
      'body{margin:0;padding:4mm;background:#fff}</style></head><body>' +
      receiptElement.outerHTML +
      '</body></html>';
    const res = await window.bouticaDesktop.printReceipt(html);
    if (!res.success) toast.error(res.error ?? 'Impression impossible');
  };

  return (
    <Modal
      isOpen={Boolean(activeReceipt)}
      onClose={closeReceipt}
      title="Ticket de caisse — Vente confirmée"
      description={`Référence vente : ${activeReceipt.saleId.slice(0, 8)}...`}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={closeReceipt}>
            Fermer
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Imprimer le ticket
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        {/* Success badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF6EF] text-[#16804A] text-xs font-semibold mb-4">
          <CheckCircle2 className="w-4 h-4" />
          Vente enregistrée avec succès
        </div>

        {/* Printable thermal receipt preview */}
        <div
          id="printable-receipt"
          className="w-full bg-white p-6 border border-[#E5E2E3] rounded-xl shadow-xs font-mono text-xs text-[#2B282C] space-y-4"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-[#E5E2E3]">
            <div className="flex justify-center mb-1">
              <BouticaLogo variant="app-icon" size="sm" />
            </div>
            <div className="font-bold text-sm tracking-wide text-[#2B282C] uppercase">{session?.user.businessName ?? 'Boutica'}</div>
            <div className="text-[11px] text-[#706C70]">Gestion commerciale Fluo</div>
                      </div>

          {/* Metadata */}
          <div className="space-y-1 text-[11px] text-[#706C70]">
            <div className="flex justify-between">
              <span>Réf :</span>
              <span className="font-medium text-[#2B282C]">{activeReceipt.saleId.slice(0, 13)}</span>
            </div>
            <div className="flex justify-between">
              <span>Date :</span>
              <span>{new Date(activeReceipt.saleDate).toLocaleString('fr-FR')}</span>
            </div>
            {activeReceipt.customerName && (
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-medium text-[#2B282C]">{activeReceipt.customerName}</span>
              </div>
            )}
          </div>

          {/* Line items table */}
          <div className="border-t border-b border-dashed border-[#E5E2E3] py-2 space-y-2">
            <div className="flex justify-between font-bold text-[10px] text-[#706C70] uppercase">
              <span>Désignation</span>
              <span>Total</span>
            </div>
            {activeReceipt.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="max-w-[70%]">
                  <div className="font-semibold text-[#2B282C] truncate">{item.name}</div>
                  <div className="text-[10px] text-[#706C70]">
                    {item.quantity} × {formatMoney(item.unitPrice)}
                  </div>
                </div>
                <div className="font-bold tabular-nums text-right">
                  {formatMoney(item.total)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-[#706C70]">
              <span>Sous-total brut :</span>
              <span className="tabular-nums font-medium">{formatMoney(activeReceipt.subtotal)}</span>
            </div>
            {activeReceipt.discount > 0 && (
              <div className="flex justify-between text-[#C62828]">
                <span>Remise appliquée :</span>
                <span className="tabular-nums font-medium">-{formatMoney(activeReceipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#9A050E] pt-1 border-t border-[#E5E2E3]">
              <span>NET À PAYER :</span>
              <span className="tabular-nums">{formatMoney(activeReceipt.total)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 border-t border-dashed border-[#E5E2E3] text-[10px] text-[#706C70]">
            <div>Merci de votre confiance !</div>
            <div>Matériaux vendus ni repris ni échangés sans bon.</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
