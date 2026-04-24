import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PackageCard from "../components/PackageCard";
import { apiUrl } from "../config/siteConfig";
import { PackagesSkeleton } from "../components/SkeletonLoaders";

const WishlistPage = () => {
  const [wishlistIds, setWishlistIds] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load wishlist IDs from localStorage
    const saved = localStorage.getItem("wishlist");
    if (saved) {
      try {
        setWishlistIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse wishlist from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchWishlistPackages = async () => {
      if (wishlistIds.length === 0) {
        setPackages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all packages and filter locally (robust and fast)
        const res = await fetch(apiUrl("/api/v1/packages?limit=100"));
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const filtered = json.data.filter((pkg) => wishlistIds.includes(pkg._id || pkg.id));
            setPackages(filtered);
          }
        }
      } catch (err) {
        console.error("Failed to fetch wishlist packages", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistPackages();
  }, [wishlistIds]);

  const handleRemove = (pkgId) => {
    const updatedIds = wishlistIds.filter((id) => id !== pkgId);
    setWishlistIds(updatedIds);
    localStorage.setItem("wishlist", JSON.stringify(updatedIds));
    setPackages(packages.filter((pkg) => (pkg._id || pkg.id) !== pkgId));
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-navy-800">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              My Wishlist
            </h1>
            <p className="text-gray-500 dark:text-navy-300 mt-2">
              Browse your saved holiday destinations and plan your next journey.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4">
            <Link to="/" className="btn btn-secondary border border-gray-300 dark:border-navy-700">
              Back to Home
            </Link>
            <Link
              to="/compare"
              className="btn btn-primary text-white bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-xl font-medium shadow-md"
            >
              Compare Packages
            </Link>
          </div>
        </div>

        {loading ? (
          <PackagesSkeleton />
        ) : packages.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-navy-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-navy-700">
            <div className="text-6xl mb-4">✈️</div>
            <h2 className="text-2xl font-semibold mb-2 text-navy-900 dark:text-white">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 dark:text-navy-300 mb-6 max-w-md mx-auto">
              Explore our amazing domestic and international packages to start adding your favorite
              travel plans!
            </p>
            <Link
              to="/"
              className="btn btn-primary bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Explore Packages
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div key={pkg._id || pkg.id} className="relative group">
                <PackageCard pkg={pkg} />
                <button
                  onClick={() => handleRemove(pkg._id || pkg.id)}
                  className="absolute top-4 left-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                  title="Remove from wishlist"
                  aria-label="Remove from wishlist"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default WishlistPage;
