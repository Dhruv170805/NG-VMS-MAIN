/**
 * AETHER Sovereign Config
 * Standardized for Vercel (Frontend) + Render (Backend)
 */
const isBrowser = typeof window !== 'undefined';

const getApiUrl = () => {
  // 1. If explicitly configured in environment variables (e.g., during build or in .env), prioritize it
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  // 2. Server-side rendering (SSR) fallback
  if (!isBrowser) return 'http://localhost:5000/api/v1';
  
  // 3. Local Development (Next.js dev server runs on port 3000)
  if (window.location.port === '3000') {
    // Under local Docker orchestration, Caddy reverse-proxies everything on port 8080.
    // If running bare-metal locally, point this to your local backend (e.g. port 5000).
    return 'http://localhost:8080/api/v1';
  }
  
  // 4. Production / IIS Deployment
  // When deploying to IIS reverse proxy on same/multiple PCs in the same network,
  // we dynamically resolve the current hostname and port (e.g., http://192.168.1.50/api/v1)
  return `${window.location.origin}/api/v1`;
};

const getSocketUrl = () => {
  // 1. Prioritize environment variable configuration
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  
  // 2. SSR Fallback
  if (!isBrowser) return 'http://localhost:5000';
  
  // 3. Local Development
  if (window.location.port === '3000') {
    return 'http://localhost:8080';
  }
  
  // 4. Production / IIS Deployment
  return window.location.origin;
};

const API_BASE_URL = getApiUrl();
const SOCKET_URL = getSocketUrl();

/**
 * Safely constructs a URL with query parameters.
 * @param path - The API endpoint path (e.g., '/visitors')
 * @param params - Object containing query parameters
 */
export const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined | null>) => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
};

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
