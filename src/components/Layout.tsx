import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavigation } from './navigation/BottomNavigation';
import { Screen } from './layout/Screen';
export const Layout = () => {
  const { pathname } = useLocation();
  const immersive = pathname === '/scanner' || pathname.startsWith('/result') || pathname.startsWith('/scan/');
  return <Screen><main className={`flex-1 min-h-0 flex flex-col relative w-full ${immersive ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}><Outlet /></main>{!immersive && <BottomNavigation />}</Screen>;
};
