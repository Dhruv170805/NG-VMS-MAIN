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

  const { hostname, port } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // ── 3. Local development (any port on localhost) ───────────────────────────
  // The backend always runs on :5000 locally regardless of the frontend port
  // (which Next.js may assign as :3000, :1716, :3001, etc.)
  if (isLocalhost) {
    return 'http://localhost:5000/api/v1';
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
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // ── 3. Local development ───────────────────────────────────────────────────
  if (isLocalhost) {
    return 'http://localhost:5000';
  }

  // ── 4. Production / LAN ───────────────────────────────────────────────────
  return window.location.origin;
};

// Resolved at module load time. Since getApiUrl() always returns an absolute
// URL, API_BASE_URL will NEVER be undefined or relative.
const API_BASE_URL = getApiUrl();
const SOCKET_URL = getSocketUrl();

/**
 * Safely builds a full API URL with optional query parameters.
 *
 * Uses API_BASE_URL (always absolute) as the base, so new URL() here
 * can NEVER throw "Invalid URL" — regardless of environment.
 *
 * @param endpoint - Full endpoint string (e.g., API_CONFIG.ENDPOINTS.VISITORS)
 *                   OR a path relative to API_BASE_URL (e.g., '/visitors')
 * @param params   - Key/value query parameters. null/undefined values are skipped.
 *
 * @example
 *   buildUrl(API_CONFIG.ENDPOINTS.VISITORS, { limit: 50, search: 'John' })
 *   // → "http://localhost:5000/api/v1/visitors?limit=50&search=John"
 */
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string => {
  // Ensure we always have a clean absolute URL base
  const base = API_BASE_URL.replace(/\/+$/, '');

  // Handle both full endpoints and short paths
  const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
  const fullUrl = isAbsolute ? endpoint : `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const url = new URL(fullUrl); // Always safe: fullUrl is always absolute

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
