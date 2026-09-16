import React from 'react';
import { useStore } from '../store/useStore';
import { AppHeader } from '../components/navigation/AppHeader';
import { RecentScanRow, RecentScansEmptyState } from '../components/history/RecentScanRow';
import { IconButton } from '../components/primitives/IconButton';
import { Trash2 } from 'lucide-react';

export const History = () => {
  const { history, clearHistory } = useStore();

  const handleClear = () => {
    if (window.confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
      clearHistory();
    }
  };

  const sortedHistory = [...history].sort((a, b) => b.date - a.date);

  return (
    <div className="flex-1 min-h-full pb-8 bg-background flex flex-col">
      <AppHeader 
        title="Historique" 
        rightAction={
          history.length > 0 && (
            <IconButton 
              icon={<Trash2 />} 
              onClick={handleClear}
              tone="danger"
              aria-label="Effacer tout l'historique"
            />
          )
        }
      />

      <div className="px-6 pt-4 flex-1">
        <p className="text-text-secondary text-body-md mb-6">{history.length} {history.length > 1 ? 'produits scannés' : 'produit scanné'}</p>

        {sortedHistory.length > 0 ? (
          <div className="flex flex-col gap-3 pb-24">
            {sortedHistory.map((scan) => (
              <RecentScanRow 
                key={scan.id}
                id={scan.id}
                barcode={scan.barcode}
                productName={scan.product.name}
                status={scan.result.status}
                thumbnailUrl={scan.product.imageUrl}
                scannedAt={new Date(scan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              />
            ))}
          </div>
        ) : (
          <div className="pt-10">
            <RecentScansEmptyState />
          </div>
        )}
      </div>
    </div>
  );
};
