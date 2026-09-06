import { icons } from 'lucide-react';

export const Icon = ({ name, className }: { name: string; className?: string }) => {
  const LucideIcon = (icons as any)[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} />;
};
