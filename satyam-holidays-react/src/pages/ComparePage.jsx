import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiUrl, resolveImageUrl } from "../config/siteConfig";
import { FaTrash, FaPlus, FaExchangeAlt, FaStar, FaMapMarkerAlt, FaClock } from "react-icons/fa";

const ComparePage = () => {
  const [allPackages, setAllPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [showSelectorIndex, setShowSelectorIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAllPackages = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/packages?limit=100"));
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setAllPackages(json.data);

            // pre-load first 2 packages from wishlist if available
            const savedWishlist = localStorage.getItem("wishlist");
            if (savedWishlist) {
              const wishlistIds = JSON.parse(savedWishlist);
              const preSelect = json.data
                .filter((pkg) => wishlistIds.includes(pkg._id || pkg.id))
                .slice(0, 2);
              setSelectedPackages(preSelect);
            } else {
              // otherwise pre-load first 2 packages in list
              setSelectedPackages(json.data.slice(0, 2));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load packages for comparison", err);
      }
    };
    fetchAllPackages();
  }, []);

  const handleRemove = (index) => {
    setSelectedPackages(selectedPackages.filter((_, i) => i !== index));
  };

  const handleAdd = (pkg) => {
    if (selectedPackages.some((p) => (p._id || p.id) === (pkg._id || pkg.id))) return;
    if (selectedPackages.length >= 3) {
      // replace last one
      setSelectedPackages([...selectedPackages.slice(0, 2), pkg]);
    } else {
      setSelectedPackages([...selectedPackages, pkg]);
    }
    setShowSelectorIndex(null);
    setSearchTerm("");
  };

  const filteredSearchList = allPackages.filter((pkg) => {
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.location.toLowerCase().includes(searchTerm.toLowerCase());
    const alreadySelected = selectedPackages.some((p) => (p._id || p.id) === (pkg._id || pkg.id));
    return matchesSearch && !alreadySelected;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-navy-800">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              Compare Packages
            </h1>
            <p className="text-gray-500 dark:text-navy-300 mt-2">
              Compare travel packages side-by-side to make the best decision.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4">
            <Link
              to="/wishlist"
              className="btn btn-secondary border border-gray-300 dark:border-navy-700"
            >
              My Wishlist
            </Link>
            <Link
              to="/"
              className="btn btn-primary text-white bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-xl font-medium shadow-md"
            >
              Browse Packages
            </Link>
          </div>
        </div>

        {/* Selected Packages Headers Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 items-stretch">
          <div className="bg-gray-50 dark:bg-navy-800/40 p-6 rounded-2xl flex flex-col justify-center border border-gray-200 dark:border-navy-800">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-amber-500 mb-4">
              <FaExchangeAlt className="text-xl" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 dark:text-white">Package Comparison</h3>
            <p className="text-xs text-gray-500 dark:text-navy-300 mt-1">
              Select up to 3 holiday packages. Hover or click card rows to compare itineraries,
              pricing models, and key highlights.
            </p>
          </div>

          {[0, 1, 2].map((idx) => {
            const pkg = selectedPackages[idx];
            if (pkg) {
              return (
                <div
                  key={pkg._id || pkg.id}
                  className="glass-card rounded-2xl p-4 relative flex flex-col justify-between border border-gray-200 dark:border-navy-800 group"
                >
                  <button
                    onClick={() => handleRemove(idx)}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from comparison"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                  <div className="h-28 overflow-hidden rounded-xl mb-3">
                    <img
                      src={resolveImageUrl(pkg.image)}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-navy-950 dark:text-white line-clamp-1 mb-1">
                    {pkg.name}
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 dark:text-navy-300 mb-2">
                    <FaMapMarkerAlt className="text-amber-500 mr-1" /> {pkg.location}
                  </div>
                  <div className="text-lg font-extrabold text-amber-500 mt-auto">{pkg.price}</div>
                </div>
              );
            } else {
              return (
                <div
                  key={`empty-${idx}`}
                  className="border-2 border-dashed border-gray-300 dark:border-navy-800 rounded-2xl flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-navy-900/20 relative"
                >
                  {showSelectorIndex === idx ? (
                    <div className="absolute inset-0 bg-white dark:bg-navy-900 z-20 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b dark:border-navy-800">
                        <span className="text-sm font-semibold">Select Package</span>
                        <button
                          onClick={() => setShowSelectorIndex(null)}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Search destination..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-navy-800 dark:border-navy-700 outline-none focus:ring-1 focus:ring-amber-500"
                        autoFocus
                      />
                      <div className="mt-2 overflow-y-auto flex-1 max-h-40 divide-y divide-gray-100 dark:divide-navy-800">
                        {filteredSearchList.length === 0 ? (
                          <div className="text-center text-xs text-gray-400 py-4">
                            No packages found
                          </div>
                        ) : (
                          filteredSearchList.map((p) => (
                            <button
                              key={p._id || p.id}
                              onClick={() => handleAdd(p)}
                              className="w-full text-left py-2 px-1 hover:bg-gray-50 dark:hover:bg-navy-800 text-xs flex items-center justify-between"
                            >
                              <span>{p.name}</span>
                              <span className="text-amber-500 font-semibold">{p.price}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowSelectorIndex(idx);
                        setSearchTerm("");
                      }}
                      className="flex flex-col items-center text-gray-400 hover:text-amber-500 transition-colors"
                    >
                      <FaPlus className="text-2xl mb-2" />
                      <span className="text-xs font-semibold">Add Package</span>
                    </button>
                  )}
                </div>
              );
            }
          })}
        </div>

        {/* Comparison Grid Table */}
        {selectedPackages.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Please select packages to start comparison.
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-800/20 border border-gray-200 dark:border-navy-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50 dark:bg-navy-950/40">
                  <th className="p-5 font-semibold text-navy-900 dark:text-white w-1/4 border-r dark:border-navy-800">
                    Criteria
                  </th>
                  {[0, 1, 2].map((idx) => (
                    <th
                      key={`head-${idx}`}
                      className="p-5 font-semibold text-navy-900 dark:text-white w-1/4 border-r dark:border-navy-800 last:border-r-0"
                    >
                      {selectedPackages[idx] ? selectedPackages[idx].name : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-navy-800">
                {/* Location */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Location
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`loc-${idx}`}
                        className="p-5 text-gray-700 dark:text-navy-200 border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? (
                          <span className="flex items-center">
                            <FaMapMarkerAlt className="text-amber-500 mr-2" /> {p.location}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Duration */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Duration
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`dur-${idx}`}
                        className="p-5 text-gray-700 dark:text-navy-200 border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? (
                          <span className="flex items-center">
                            <FaClock className="text-amber-500 mr-2" /> {p.duration}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Price */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Starting Price
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`price-${idx}`}
                        className="p-5 text-amber-500 font-extrabold text-lg border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? p.price : ""}
                      </td>
                    );
                  })}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Rating
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`rate-${idx}`}
                        className="p-5 border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? (
                          <div className="flex items-center text-sm">
                            <FaStar className="text-yellow-400 mr-1" />
                            <span className="font-semibold">{p.rating}</span>
                            <span className="text-gray-400 ml-1">({p.reviews} reviews)</span>
                          </div>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Visa */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Visa Requirements
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`visa-${idx}`}
                        className="p-5 text-gray-700 dark:text-navy-200 border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? p.visa || "Not Required" : ""}
                      </td>
                    );
                  })}
                </tr>

                {/* Highlights */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Key Highlights
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`high-${idx}`}
                        className="p-5 border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.highlights?.slice(0, 5).map((h, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200/50"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Description */}
                <tr>
                  <td className="p-5 font-semibold text-navy-800 dark:text-navy-300 bg-gray-50/20 dark:bg-navy-900/10 border-r dark:border-navy-800">
                    Overview
                  </td>
                  {[0, 1, 2].map((idx) => {
                    const p = selectedPackages[idx];
                    return (
                      <td
                        key={`desc-${idx}`}
                        className="p-5 text-xs text-gray-500 dark:text-navy-300 leading-relaxed border-r dark:border-navy-800 last:border-r-0"
                      >
                        {p ? p.description : ""}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default ComparePage;
