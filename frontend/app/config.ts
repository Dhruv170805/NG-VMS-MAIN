/**
 * NG-VMS API Configuration
 * ─────────────────────────────────────────────────────────────
 * Handles 3 deployment environments automatically:
 *   1. .env override  → NEXT_PUBLIC_API_URL (highest priority)
 *   2. Local dev      → any localhost port → backend on :5000
 *   3. Production/IIS → same origin as frontend (reverse proxy)
 * ─────────────────────────────────────────────────────────────
 */

const isBrowser = typeof window !== 'undefined';

/**
 * Returns the base API URL. Safe to call during SSR and in browser.
 *
 * Priority:
 *  1. NEXT_PUBLIC_API_URL env var (set at build time or in .env)
 *  2. Localhost / 127.0.0.1 (any port) → always use backend on :5000
 *  3. LAN/Production (IIS, Caddy) → same origin, backend is reverse-proxied
 */
const getApiUrl = (): string => {
  // ── 1. Explicit env override (Docker, CI, cloud deployments) ──────────────
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // ── 2. SSR fallback (Next.js server render — no window) ───────────────────
  if (!isBrowser) {
    return 'http://localhost:5000/api/v1';
  }

  const { hostname } = window.location;
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '::1' || 
    hostname === '[::1]' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.') ||
    hostname.endsWith('.local');

  // ── 3. Local development (any port on localhost or LAN) ────────────────────
  // The backend always runs on :5000 locally regardless of the frontend port
  // (which Next.js may assign as :3000, :1716, :3001, etc.)
  if (isLocal) {
    return `http://${hostname}:5000/api/v1`;
  }

  // ── 4. Production / LAN / IIS deployment ──────────────────────────────────
  // Backend is reverse-proxied through the same host (IIS ARR / Caddy / Nginx)
  // e.g. http://192.168.1.50/api/v1 or https://vms.company.local/api/v1
  return `${window.location.origin}/api/v1`;
};

/**
 * Returns the WebSocket URL. Mirrors the API URL logic.
 */
const getSocketUrl = (): string => {
  // ── 1. Explicit env override ───────────────────────────────────────────────
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  // ── 2. SSR fallback ───────────────────────────────────────────────────────
  if (!isBrowser) {
    return 'http://localhost:5000';
  }

  const { hostname } = window.location;
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '::1' || 
    hostname === '[::1]' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.') ||
    hostname.endsWith('.local');

  // ── 3. Local development ───────────────────────────────────────────────────
  if (isLocal) {
    return `http://${hostname}:5000`;
  }

  // ── 4. Production / LAN ───────────────────────────────────────────────────
  return window.location.origin;
};

// Resolved at module load time. Since getApiUrl() always returns an absolute
// URL, API_BASE_URL will NEVER be undefined or relative.
const API_BASE_URL = getApiUrl();
const SOCKET_URL = getSocketUrl();

/**
 * Resolves the pathname of the base API URL (e.g. "/api/v1").
 */
const getBasePathname = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      return new URL(API_BASE_URL).pathname.replace(/\/+$/, '');
    } catch (e) {
      return '/api/v1';
    }
  }
  return API_BASE_URL.replace(/\/+$/, '');
};

/**
 * Safely builds a full API URL with optional query parameters.
 *
 * Resolves the path relative to the base URL or the current window location
 * if the base URL is relative. Safe to call during SSR and in browser.
 */
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string => {
  let resolvedUrl: string;

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    resolvedUrl = endpoint;
  } else {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const basePathname = getBasePathname();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let path: string;
    if (basePathname && cleanEndpoint.startsWith(basePathname)) {
      if (base.startsWith('http://') || base.startsWith('https://')) {
        try {
          const origin = new URL(base).origin;
          path = `${origin}${cleanEndpoint}`;
        } catch (e) {
          path = cleanEndpoint;
        }
      } else {
        path = cleanEndpoint;
      }
    } else {
      path = `${base}${cleanEndpoint}`;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      resolvedUrl = path;
    } else {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
      resolvedUrl = `${origin.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    }
  }

  const url = new URL(resolvedUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
};

// ── Exported configuration object ────────────────────────────────────────────
export const API_CONFIG = {
  /** Absolute API base URL (e.g. http://localhost:5000/api/v1) */
  BASE_URL: API_BASE_URL,

  /** WebSocket server URL */
  SOCKET_URL: SOCKET_URL,

  /** Pre-built endpoint strings — always absolute, ready to use in fetch() */
  ENDPOINTS: {
    VISITORS:  `${API_BASE_URL}/visitors`,
    SYSTEM:    `${API_BASE_URL}/system`,
    AUTH:      `${API_BASE_URL}/auth`,
    ANALYTICS: `${API_BASE_URL}/analytics`,
    EMPLOYEES: `${API_BASE_URL}/employees`,
    GATE:      `${API_BASE_URL}/gate`,
    HANDOVER:  `${API_BASE_URL}/handover`,
    BLACKLIST: `${API_BASE_URL}/blacklist`,
    AADHAAR:   `${API_BASE_URL}/aadhaar`,
  },
} as const;
