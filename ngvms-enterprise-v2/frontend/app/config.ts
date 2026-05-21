/**
 * AETHER Sovereign Config
 * Standardized for Vercel (Frontend) + Render (Backend)
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

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
