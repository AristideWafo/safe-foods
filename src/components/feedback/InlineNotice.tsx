import React from 'react';
import { clsx } from 'clsx';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface InlineNoticeProps {
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const InlineNotice: React.FC<InlineNoticeProps> = ({ tone, title, description, action, className }) => {
  const isError = tone === 'error';
  
  return (
    <div 
      role={isError ? "alert" : "status"}
      className={clsx(
        "rounded-xl p-4 flex gap-3",
        tone === 'info' && "bg-information/10 text-information",
        tone === 'success' && "bg-verified/10 text-verified",
        tone === 'warning' && "bg-warning/10 text-warning",
        tone === 'error' && "bg-danger/10 text-danger",
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        {tone === 'info' && <Info className="w-5 h-5" />}
        {tone === 'success' && <CheckCircle className="w-5 h-5" />}
        {tone === 'warning' && <AlertTriangle className="w-5 h-5" />}
        {tone === 'error' && <XCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <h4 className={clsx(
          "font-bold text-[14px] leading-tight",
          tone === 'info' && "text-information",
          tone === 'success' && "text-verified",
          tone === 'warning' && "text-amber-800",
          tone === 'error' && "text-coral-800"
        )}>
          {title}
        </h4>
        {description && (
          <p className={clsx(
            "text-[13px] mt-1 leading-relaxed",
            tone === 'info' && "text-information/80",
            tone === 'success' && "text-verified/80",
            tone === 'warning' && "text-amber-800/80",
            tone === 'error' && "text-coral-800/80"
          )}>
            {description}
          </p>
        )}
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
