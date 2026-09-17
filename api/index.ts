import { createConfiguredApp } from '../server/runtime.js';

// Vercel invokes the Express handler directly; the frontend stays a static Vite build.
// The function is only reachable through Vercel’s HTTPS reverse proxy.
export default createConfiguredApp(1);
