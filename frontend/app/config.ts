/**
 * AETHER Sovereign Config
 * Standardized for Vercel (Frontend) + Render (Backend)
 */
const isBrowser = typeof window !== 'undefined';

// Use explicit env variables if defined, otherwise derive dynamically from the browser's origin.
// This enables seamless reverse-proxy deployments (Caddy, IIS, Nginx) without hardcoding domains.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (isBrowser ? `${window.location.origin}/api` : 'http://localhost:5001/api');
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (isBrowser ? window.location.origin : 'http://localhost:5001');

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  SOCKET_URL: SOCKET_URL,
  ENDPOINTS: {
    VISITORS: `${API_BASE_URL}/visitors`,
    SYSTEM: `${API_BASE_URL}/system`,
    AUTH: `${API_BASE_URL}/auth`,
    ANALYTICS: `${API_BASE_URL}/analytics`,
    EMPLOYEES: `${API_BASE_URL}/employees`,
    GATE: `${API_BASE_URL}/gate`,
    HANDOVER: `${API_BASE_URL}/handover`,
    BLACKLIST: `${API_BASE_URL}/blacklist`,
    AADHAAR: `${API_BASE_URL}/aadhaar`
  }
};
