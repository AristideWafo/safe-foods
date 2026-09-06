import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './navigation/BottomNavigation';
import { Screen } from './layout/Screen';

export const Layout = () => {
  return (
    <Screen>
      <div className="flex-1 min-h-0 flex flex-col relative w-full">
        <Outlet />
      </div>
      <BottomNavigation />
    </Screen>
  );
};
