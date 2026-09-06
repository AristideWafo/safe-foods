import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DisclaimerWarning = () => {
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mx-4 my-6 mt-auto">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
        </div>
        <div className="text-[11px] text-orange-800 leading-[1.4]">
          <span className="font-bold">DISCLAIMER :</span> Cette application est un outil d'aide. 
          Elle ne remplace pas la lecture attentive de l'étiquette. En cas de doute, consultez un médecin.
        </div>
      </div>
    </div>
  );
};
