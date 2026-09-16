import { Wheat, Shrimp, Egg, Fish, NutOff, Sprout, Milk, Nut, Leaf, Droplet, CircleDot, TestTube, Flower2, Shell } from 'lucide-react';
import type { AllergenIconName } from '../types';
const ICONS = { Wheat, Shrimp, Egg, Fish, NutOff, Sprout, Milk, Nut, Leaf, Droplet, CircleDot, TestTube, Flower2, Shell };
export const Icon = ({ name, className }: { name: AllergenIconName; className?: string }) => {
  const Component = ICONS[name];
  return <Component className={className} aria-hidden="true" />;
};
