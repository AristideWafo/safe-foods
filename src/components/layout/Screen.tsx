import React from 'react';
import { clsx } from 'clsx';

interface ScreenProps {
  children: React.ReactNode;
  background?: 'background' | 'surface' | 'image' | 'transparent';
  fullscreen?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({ 
  children, 
  background = 'background',
  fullscreen = false 
}) => {
  return (
    <div className="w-full h-[100dvh] bg-surface flex justify-center overflow-hidden">
      {/* Mobile constraint container */}
      <div 
        className={clsx(
          "w-full max-w-[480px] h-full flex flex-col relative shadow-[0_0_40px_rgba(0,0,0,0.05)] overflow-hidden",
          background === 'background' && "bg-background",
          background === 'surface' && "bg-surface",
          background === 'transparent' && "bg-transparent",
          background === 'image' && "bg-black"
        )}
      >
        <main className={clsx(
          "flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col relative",
          // The Layout component adds the padding to Home etc.
          // Scanner and Result don't use this padding directly.
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};
