import { useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "../config/siteConfig";

const PAGE_SIZE = 12;

/**
 * Custom hook for fetching and filtering packages with pagination
 * @param {string} category - 'domestic' or 'international'
 * @returns {object} - packages state and handlers
 */
export function usePackages(category) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPackages = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const response = await fetch(
          apiUrl(`/api/packages?category=${category}&limit=${PAGE_SIZE}&page=${pageNum}`)
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();

        if (json.success) {
          if (Array.isArray(json.data)) {
            if (append) {
              setPackages((prev) => [...prev, ...json.data]);
            } else {
              setPackages(json.data);
            }

            // Track pagination state from API response
            if (json.pagination) {
              setHasMore(json.pagination.hasNextPage || false);
              setTotalItems(json.pagination.total || json.data.length);
            } else {
              setHasMore(false);
              setTotalItems(json.data.length);
            }
            setPage(pageNum);
          } else {
            setPackages([]);
            setError("Received unexpected package data. Please try again.");
          }
        } else {
          setError(json.message || "Failed to load packages");
        }
      } catch (err) {
        setError("Failed to fetch packages. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        // Reset state when category changes
        setPage(1);
        setPackages([]);
        setHasMore(false);
        await fetchPackages(1, false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchPackages]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPackages(page + 1, true);
    }
  }, [fetchPackages, page, loadingMore, hasMore]);

  const filteredPackages = useMemo(() => {
    if (!Array.isArray(packages)) return [];
    if (activeFilter === "all") return packages;
    return packages.filter(
      (pkg) => pkg.category === activeFilter || pkg.subcategory === activeFilter
    );
  }, [packages, activeFilter]);

  const setFilter = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const refetch = useCallback(() => fetchPackages(1, false), [fetchPackages]);

  return {
    packages: filteredPackages,
    allPackages: packages,
    loading,
    loadingMore,
    error,
    activeFilter,
    setFilter,
    refetch,
    loadMore,
    hasMore,
    totalItems,
    page,
  };
}

export default usePackages;
