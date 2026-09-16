import type { ReactNode } from 'react';
import { clsx } from 'clsx';
interface ScreenProps { children: ReactNode; background?: 'background' | 'surface' | 'image' | 'transparent'; }
export const Screen = ({ children, background = 'background' }: ScreenProps) => <div className="w-full h-[100dvh] bg-background flex justify-center overflow-hidden"><div className={clsx('w-full max-w-[540px] h-full flex flex-col relative overflow-hidden', background === 'background' && 'bg-background', background === 'surface' && 'bg-surface', background === 'transparent' && 'bg-transparent', background === 'image' && 'bg-black')}>{children}</div></div>;
