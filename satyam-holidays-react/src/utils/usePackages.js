import { useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "../config/siteConfig";

/**
 * Custom hook for fetching and filtering packages
 * @param {string} category - 'domestic' or 'international'
 * @returns {object} - packages state and handlers
 */
export function usePackages(category) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiUrl(`/api/packages?category=${category}&limit=50`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!cancelled) {
          if (json.success) {
            if (Array.isArray(json.data)) {
              setPackages(json.data);
            } else {
              setPackages([]);
              setError("Received unexpected package data. Please try again.");
            }
          } else {
            setError(json.message || "Failed to load packages");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to fetch packages. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPackages();

    return () => {
      cancelled = true;
    };
  }, [category]);

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

  return {
    packages: filteredPackages,
    allPackages: packages,
    loading,
    error,
    activeFilter,
    setFilter,
    refetch: useCallback(() => {
      setLoading(true);
      setError(null);
    }, []),
  };
}

export default usePackages;
