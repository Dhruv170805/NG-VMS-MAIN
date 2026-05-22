/**
 * AETHER Sovereign Config
 * Standardized for Vercel (Frontend) + Render (Backend)
 */
const isBrowser = typeof window !== 'undefined';

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (!isBrowser) return 'http://localhost:5000/api/v1';
  
  if (window.location.port === '3000') {
    return 'http://localhost:8080/api/v1';
  }
  return `${window.location.origin}/api/v1`;
};

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!isBrowser) return 'http://localhost:5000';
  
  if (window.location.port === '3000') {
    return 'http://localhost:8080';
  }
  return window.location.origin;
};

const API_BASE_URL = getApiUrl();
const SOCKET_URL = getSocketUrl();

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
