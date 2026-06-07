import Cookies from "js-cookie";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

let memoryCsrfToken = null;

const getApiBaseUrl = () => {
  return (
    process.env.REACT_APP_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
};

/**
 * Get the CSRF token from memory, sessionStorage, or cookie
 */
export function getCsrfToken() {
  if (memoryCsrfToken) return memoryCsrfToken;
  try {
    const sessionToken = sessionStorage.getItem("csrf_token");
    if (sessionToken) {
      memoryCsrfToken = sessionToken;
      return sessionToken;
    }
  } catch (e) {
    // sessionStorage might be blocked/disabled
  }
  return Cookies.get(CSRF_COOKIE_NAME);
}

/**
 * Save the CSRF token in memory, sessionStorage, and local cookie
 */
export function setCsrfToken(token) {
  if (!token) return;
  memoryCsrfToken = token;
  try {
    sessionStorage.setItem("csrf_token", token);
  } catch (e) {
    // ignore
  }
  try {
    Cookies.set(CSRF_COOKIE_NAME, token, { path: "/", sameSite: "lax" });
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch a fresh CSRF token from the server
 */
export async function refreshCsrfToken(apiBase = "") {
  const base = apiBase || getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/csrf-token`, {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
        return data.csrfToken;
      }
    }
  } catch (err) {
    console.error("Error refreshing CSRF token:", err);
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
    let token = getCsrfToken();
    if (!token) {
      token = await refreshCsrfToken();
    }
    options.headers = withCsrfHeader(options.headers || {});
  }

  // Always include credentials for cookie-based auth
  options.credentials = options.credentials || "include";

  return fetch(url, options);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
