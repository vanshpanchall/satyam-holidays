import { useEffect, useState } from "react";
import { apiUrl } from "../config/siteConfig";

// The catalogue is small (tens of packages), so we load every active package once,
// share it across pages and filter client-side. Pages of 100 are fetched until done.
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const TTL_MS = 5 * 60 * 1000;

let store = { data: null, fetchedAt: 0, promise: null };

async function loadCatalog() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await fetch(apiUrl(`/api/packages?limit=${PAGE_SIZE}&page=${page}`));
    if (!res.ok) throw new Error(`Couldn't load packages (HTTP ${res.status})`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error("Unexpected package data");
    all.push(...json.data);
    // The API reports currentPage/totalPages (older builds sent hasNextPage)
    const p = json.pagination || {};
    if (!(p.hasNextPage || Number(p.currentPage) < Number(p.totalPages))) break;
  }
  return all;
}

export function fetchCatalog({ force = false } = {}) {
  const fresh = store.data && Date.now() - store.fetchedAt < TTL_MS;
  if (fresh && !force) return Promise.resolve(store.data);
  if (store.promise) return store.promise;

  store.promise = loadCatalog()
    .then((data) => {
      store = { data, fetchedAt: Date.now(), promise: null };
      return data;
    })
    .catch((err) => {
      store.promise = null;
      throw err;
    });
  return store.promise;
}

export default function usePackageCatalog() {
  const [state, setState] = useState(() => ({
    packages: store.data || [],
    loading: !store.data,
    error: null,
  }));

  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((packages) => active && setState({ packages, loading: false, error: null }))
      .catch(
        (err) =>
          active &&
          setState((prev) => ({ ...prev, loading: false, error: err.message || "Failed to load" }))
      );
    return () => {
      active = false;
    };
  }, []);

  const retry = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchCatalog({ force: true })
      .then((packages) => setState({ packages, loading: false, error: null }))
      .catch((err) => setState((prev) => ({ ...prev, loading: false, error: err.message })));
  };

  return { ...state, retry };
}
