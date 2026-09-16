import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ScanLine, History, UserRound } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNavigation = () => {
  return (
    <nav aria-label="Navigation principale" className="shrink-0 mx-4 mb-[max(12px,env(safe-area-inset-bottom))] mt-3 bg-white/96 rounded-full shadow-[0_8px_28px_rgba(37,27,14,0.08)] backdrop-blur-[18px] py-2 px-2 flex justify-around items-center z-40 h-[76px]">
      <NavItem to="/" icon={<Home />} label="Accueil" />
      <NavItem to="/scanner" icon={<ScanLine />} label="Scanner" />
      <NavItem to="/history" icon={<History />} label="Historique" />
      <NavItem to="/profile" icon={<UserRound />} label="Profil" />
    </nav>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  return (
    <NavLink 
      to={to} 
      aria-label={label}
      className={({ isActive }) => clsx(
        "relative flex flex-col items-center justify-center min-w-0 flex-1 h-full gap-1 transition-colors duration-200",
        isActive ? "text-primary-500" : "text-text-muted hover:text-text-secondary"
      )}
    >
      {({ isActive }) => (
        <>
          <span className={clsx('flex items-center justify-center', to === '/scanner' && 'bg-primary-500 text-white rounded-full w-12 h-12 -mt-5 shadow-lg shadow-primary-500/25')}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
          </span>
          <span className="text-[11px] font-semibold">{label}</span>
          {isActive && <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-primary-500 rounded-full" />}
        </>
      )}
    </NavLink>
  );
};
