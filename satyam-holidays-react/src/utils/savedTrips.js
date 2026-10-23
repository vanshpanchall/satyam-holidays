import { useCallback, useSyncExternalStore } from "react";

// Wishlist + recently-viewed, persisted in localStorage and shared across components.
// The "wishlist" key matches what earlier versions of the site stored.
const KEYS = { wishlist: "wishlist", recent: "recentlyViewed" };
const MAX_RECENT = 8;
const EVENT = "saved-trips-change";

const read = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

// useSyncExternalStore needs a stable snapshot reference per value
const cache = {};
const snapshot = (key) => {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // storage blocked (private mode) — fall through to empty list
  }
  if (cache[key]?.raw !== raw) cache[key] = { raw, value: read(key) };
  return cache[key].value;
};

const write = (key, ids) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // ignore quota / privacy-mode errors
  }
  window.dispatchEvent(new Event(EVENT));
};

const subscribe = (callback) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

const EMPTY = [];

export function useWishlist() {
  const ids = useSyncExternalStore(
    subscribe,
    () => snapshot(KEYS.wishlist),
    () => EMPTY
  );

  const has = useCallback((id) => ids.includes(String(id)), [ids]);

  const toggle = useCallback((id) => {
    const key = String(id);
    const current = read(KEYS.wishlist);
    const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
    write(KEYS.wishlist, next);
    return next.includes(key);
  }, []);

  const remove = useCallback((id) => {
    write(
      KEYS.wishlist,
      read(KEYS.wishlist).filter((x) => x !== String(id))
    );
  }, []);

  return { ids, has, toggle, remove };
}

export function useRecentlyViewed() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(KEYS.recent),
    () => EMPTY
  );
}

export function trackRecentlyViewed(id) {
  if (!id) return;
  const key = String(id);
  const next = [key, ...read(KEYS.recent).filter((x) => x !== key)].slice(0, MAX_RECENT);
  write(KEYS.recent, next);
}
