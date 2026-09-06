import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ScanLine, History, UserRound } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNavigation = () => {
  return (
    <nav className="absolute bottom-0 w-full bg-white/96 backdrop-blur-[18px] pb-[max(12px,env(safe-area-inset-bottom))] pt-2 px-6 flex justify-between items-center z-40 border-t border-border-subtle h-[calc(74px+max(12px,env(safe-area-inset-bottom)))]">
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
        "relative flex flex-col items-center justify-center min-w-[64px] h-full gap-1 transition-colors duration-200",
        isActive ? "text-primary-500" : "text-text-muted hover:text-text-secondary"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute top-[-8px] w-[30px] h-[3px] bg-primary-500 rounded-b-full" />
          )}
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 mb-0.5" })}
          <span className="text-[11px] font-semibold">{label}</span>
        </>
      )}
    </NavLink>
  );
};
