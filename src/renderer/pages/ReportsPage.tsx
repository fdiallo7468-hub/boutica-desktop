import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { apiClient } from '../lib/api-client.ts';
import { toast } from 'sonner';
import { errorText } from '../components/ui/LoadError.tsx';

export const ReportsPage: React.FC = () => {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const handleDownload = async (
    type: 'sales/excel' | 'inventory/excel' | 'sales/pdf' | 'inventory/pdf',
    _suggestedName?: string
  ) => {
    setDownloadingType(type);
    try {
      // Le fichier est récupéré par le processus principal puis enregistré à l'emplacement choisi.
      const res = await apiClient.downloadReport(type);
      if ('filePath' in res) toast.success('Rapport enregistré');
    } catch (err) {
      toast.error(errorText(err, 'Échec du téléchargement du rapport'));
    } finally {
      setDownloadingType(null);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Rapports & Exports Comptables</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Générez et téléchargez vos documents certifiés aux formats Excel (.xlsx) et PDF
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Reports Section */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-[#EAF2FB] text-[#3478C8]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2B282C]">Journal des Ventes & Recettes</h2>
                <p className="text-xs text-[#706C70]">
                  Détail exhaustif de chaque ticket de caisse, remises et encaissements
                </p>
              </div>
            </div>

            <ul className="text-xs text-[#706C70] space-y-1.5 my-4 pl-4 list-disc">
              <li>Historique de toutes les transactions du mois</li>
              <li>Calcul automatisé du chiffre d'affaires et de la marge brute</li>
              <li>Idéal pour la comptabilité et les déclarations fiscales</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#E5E2E3]">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              isLoading={downloadingType === 'sales/excel'}
              onClick={() => handleDownload('sales/excel', `journal-ventes-${todayStr}.xlsx`)}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#16804A]" />}
            >
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={downloadingType === 'sales/pdf'}
              onClick={() => handleDownload('sales/pdf', `rapport-ventes-${todayStr}.pdf`)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Rapport PDF
            </Button>
          </div>
        </Card>

        {/* Inventory Reports Section */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-[#FFF4DF] text-[#D99016]">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2B282C]">État des Stocks & Inventaire</h2>
                <p className="text-xs text-[#706C70]">
                  Valorisation financière du stock physique et inventaire théorique
                </p>
              </div>
            </div>

            <ul className="text-xs text-[#706C70] space-y-1.5 my-4 pl-4 list-disc">
              <li>Inventaire de tous les SKU (ciment, fer, agrégats, quincaillerie)</li>
              <li>Valorisation au coût d'achat et au prix de vente comptoir</li>
              <li>Identification immédiate des ruptures de stock</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#E5E2E3]">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              isLoading={downloadingType === 'inventory/excel'}
              onClick={() => handleDownload('inventory/excel', `inventaire-stocks-${todayStr}.xlsx`)}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#16804A]" />}
            >
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={downloadingType === 'inventory/pdf'}
              onClick={() => handleDownload('inventory/pdf', `etat-stocks-${todayStr}.pdf`)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              État des Stocks (PDF)
            </Button>
          </div>
        </Card>
      </div>

      {/* Compliance Note */}
      <Card padding="sm" className="bg-[#F7F6F6] text-xs text-[#706C70]">
        <div className="flex items-center gap-2 font-semibold text-[#2B282C] mb-1">
          <CheckCircle2 className="w-4 h-4 text-[#16804A]" />
          Conformité des exports Boutica Cloud
        </div>
        <p>
          Les fichiers générés proviennent directement du serveur de production Boutica Cloud et
          reflètent fidèlement l'état de la base de données PostgreSQL sans altération locale.
        </p>
      </Card>
    </div>
  );
};
