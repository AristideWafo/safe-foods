import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const BrandMark: React.FC = () => {
  return (
    <Link to="/" className="flex items-center gap-1 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-300 rounded-md">
      <span className="font-display font-extrabold text-[30px] tracking-tight">
        <span className="text-text-primary">Safe</span>
        <span className="text-primary-500">Eat</span>
      </span>
      <Sparkles className="w-5 h-5 text-verified mt-[-12px]" aria-hidden="true" />
    </Link>
  );
};
