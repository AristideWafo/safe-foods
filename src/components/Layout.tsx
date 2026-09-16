import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavigation } from './navigation/BottomNavigation';
import { Screen } from './layout/Screen';
export const Layout = () => {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [pathname]);
  const immersive = pathname === '/scanner' || pathname.startsWith('/result') || pathname.startsWith('/scan/');
  return <Screen><main ref={mainRef} className={`flex-1 min-h-0 flex flex-col relative w-full ${immersive ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}><Suspense fallback={<div className="flex-1 flex items-center justify-center" role="status">Chargement…</div>}><Outlet /></Suspense></main><BottomNavigation /></Screen>;
};
