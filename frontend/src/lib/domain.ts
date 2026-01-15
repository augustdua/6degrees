const DEFAULT_APP_HOST = 'app.crosslunch.com';

export const APP_HOST = import.meta.env.VITE_APP_HOST || DEFAULT_APP_HOST;
export const LANDING_HOSTS = new Set(['crosslunch.com', 'www.crosslunch.com']);

export const isLandingHost = (host?: string) => {
  if (typeof window === 'undefined') return false;
  return LANDING_HOSTS.has(host || window.location.hostname);
};

export const toAppUrl = (path: string) => {
  if (!path) return `https://${APP_HOST}/`;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `https://${APP_HOST}${normalized}`;
};

export const currentPathWithSearchHash = () => {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

