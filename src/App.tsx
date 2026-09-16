/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Scanner = lazy(() => import('./pages/Scanner').then(module => ({ default: module.Scanner })));
const Result = lazy(() => import('./pages/Result').then(module => ({ default: module.Result })));
const History = lazy(() => import('./pages/History').then(module => ({ default: module.History })));
const NotFound = lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="history" element={<History />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="scan/:scanId" element={<Result />} />
          <Route path="result" element={<Result />} />
          <Route path="result/:barcode" element={<Result />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
