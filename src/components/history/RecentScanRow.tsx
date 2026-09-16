import React from 'react';
import { Link } from 'react-router-dom';
import { AnalysisStatus } from '../../types';
import { TriangleAlert, FileQuestion } from 'lucide-react';

interface RecentScanRowProps {
  id: string;
  barcode: string;
  productName: string;
  scannedAt: string;
  thumbnailUrl?: string;
  status: AnalysisStatus;
}

export const RecentScanRow: React.FC<RecentScanRowProps> = ({
  id, productName, scannedAt, thumbnailUrl, status
}) => {

  const getStatusIcon = () => {
    switch (status) {
      case 'AVOID': return <div className="w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center shrink-0" aria-label="À éviter"><span className="text-[18px] font-bold leading-none -mt-[2px]">!</span></div>;
      case 'UNCERTAIN': return <div className="w-8 h-8 rounded-full bg-warning text-white flex items-center justify-center shrink-0" aria-label="Prudence"><TriangleAlert className="w-[18px] h-[18px] stroke-[2.5] fill-warning text-white" /></div>;
      case 'SAFE': return <div className="w-8 h-8 rounded-full bg-[#334a00] text-white flex items-center justify-center shrink-0" aria-label="Aucun allergène détecté"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>;
      default: return <div className="w-8 h-8 rounded-full bg-text-tertiary/10 text-text-secondary flex items-center justify-center shrink-0" aria-label="Inconnu"><FileQuestion className="w-4 h-4" /></div>;
    }
  };

  return (
    <Link
      to={`/scan/${encodeURIComponent(id)}`}
      className="flex items-center min-h-[72px] p-3 rounded-[16px] bg-white border border-border-subtle shadow-[0_4px_12px_rgba(13,27,54,0.03)] transition-transform active:scale-[0.98] hover:bg-black/5"
    >
      {thumbnailUrl ? (
        <div className="w-[42px] h-[52px] rounded-md overflow-hidden bg-background shrink-0 flex items-center justify-center mr-3">
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-[42px] h-[52px] rounded-md bg-background border border-border-subtle shrink-0 flex items-center justify-center mr-3">
          <span className="text-[10px] font-bold text-text-muted uppercase text-center leading-none">Photo<br/>N/A</span>
        </div>
      )}

      <div className="flex-1 min-w-0 mr-3">
        <h3 className="font-semibold text-text-primary text-[15px] truncate leading-tight mb-0.5">
          {productName || "Produit inconnu"}
        </h3>
        <p className="text-[12px] font-medium text-text-tertiary">
          {scannedAt}
        </p>
      </div>

      {getStatusIcon()}
    </Link>
  );
};

export const RecentScansEmptyState: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center text-center p-6 bg-white rounded-[22px] border border-border-subtle border-dashed">
      <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4">
        <span className="text-2xl" aria-hidden="true">📦</span>
      </div>
      <h3 className="font-bold text-[16px] text-text-primary mb-1">Aucun scan pour le moment</h3>
      <p className="text-[14px] text-text-secondary mb-4">Votre historique apparaîtra ici.</p>
    </div>
  );
};
