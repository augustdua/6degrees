export const POST_AUTH_REDIRECT_KEY = 'post_auth_redirect_v1';

function sanitizeRedirectTarget(target: string, fallbackPath = '/'): string {
  if (!target) return fallbackPath;

  // Allow simple in-app absolute paths.
  if (target.startsWith('/') && !target.startsWith('//')) return target;

  // If someone passed a full URL, only accept same-origin and reduce to path+search+hash.
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // ignore
  }

  return fallbackPath;
}

export function setPostAuthRedirect(path: string) {
  try {
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, sanitizeRedirectTarget(path, '/'));
  } catch {
    // Ignore (e.g. storage disabled)
  }
}

export function consumePostAuthRedirect(fallbackPath = '/'): string {
  try {
    const value = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    if (value) sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return sanitizeRedirectTarget(value || '', fallbackPath);
  } catch {
    return fallbackPath;
  }
}

export function getOAuthCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function getCurrentPathWithSearchAndHash(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}


