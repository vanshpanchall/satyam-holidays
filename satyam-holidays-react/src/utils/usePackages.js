import { useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "../config/siteConfig";

const PAGE_SIZE = 12;
const clientPackageCache = new Map();

/**
 * Custom hook for fetching and filtering packages with pagination
 * @param {string} category - 'domestic' or 'international'
 * @returns {object} - packages state and handlers
 */
export function usePackages(category) {
  const cached = clientPackageCache.get(category);
  const [packages, setPackages] = useState(cached ? cached.data : []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(cached ? cached.hasMore : false);
  const [totalItems, setTotalItems] = useState(cached ? cached.totalItems : 0);

  const fetchPackages = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else if (!clientPackageCache.has(category)) {
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
            let nextPackages = json.data;
            if (append) {
              setPackages((prev) => {
                nextPackages = [...prev, ...json.data];
                return nextPackages;
              });
            } else {
              setPackages(json.data);
            }

            const nextHasMore = json.pagination ? Boolean(json.pagination.hasNextPage) : false;
            const nextTotal = json.pagination
              ? json.pagination.total || json.data.length
              : json.data.length;

            if (json.pagination) {
              setHasMore(nextHasMore);
              setTotalItems(nextTotal);
            } else {
              setHasMore(false);
              setTotalItems(json.data.length);
            }
            setPage(pageNum);

            // Cache page 1 results
            if (pageNum === 1) {
              clientPackageCache.set(category, {
                data: json.data,
                hasMore: nextHasMore,
                totalItems: nextTotal,
              });
            }
          } else {
            setPackages([]);
            setError("Received unexpected package data. Please try again.");
          }
        } else {
          setError(json.message || "Failed to load packages");
        }
      } catch (err) {
        if (!clientPackageCache.has(category)) {
          setError("Failed to fetch packages. Please try again.");
        }
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
