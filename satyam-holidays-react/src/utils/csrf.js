import Cookies from "js-cookie";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Get the CSRF token from cookie
 */
export function getCsrfToken() {
  return Cookies.get(CSRF_COOKIE_NAME);
}

/**
 * Fetch a fresh CSRF token from the server
 */
export async function refreshCsrfToken(apiBase = "") {
  try {
    const res = await fetch(`${apiBase}/api/csrf-token`, {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken;
    }
  } catch {
    // Ignore errors, token should be set via cookie
  }
  return getCsrfToken();
}

/**
 * Add CSRF token to request headers
 */
export function withCsrfHeader(headers = {}) {
  const token = getCsrfToken();
  if (token) {
    return {
      ...headers,
      [CSRF_HEADER_NAME]: token,
    };
  }
  return headers;
}

/**
 * Enhanced fetch that automatically includes CSRF token for state-changing requests
 */
export async function csrfFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (stateChangingMethods.includes(method)) {
    options.headers = withCsrfHeader(options.headers || {});
  }

  // Always include credentials for cookie-based auth
  options.credentials = options.credentials || "include";

  return fetch(url, options);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
