import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiUrl, fetchWithAuth, toastApiError } from "../config/siteConfig";
import {
  FaPaperPlane,
  FaSpinner,
  FaCalendarAlt,
  FaUserFriends,
  FaMapMarkerAlt,
  FaPrint,
  FaLightbulb,
  FaCheck,
} from "react-icons/fa";
import html2canvas from "html2canvas";

const AiPlannerPage = () => {
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("5");
  const [travelers, setTravelers] = useState("2");
  const [interests, setInterests] = useState([]);
  const [otherInterests, setOtherInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);

  const interestTags = [
    "Spiritual/Temples",
    "Adventure",
    "Beach",
    "Nature/Hills",
    "Historical",
    "Shopping",
    "Leisure/Relax",
  ];

  const handleInterestToggle = (tag) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((i) => i !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);
    setItinerary(null);

    const mergedInterests =
      [...interests, otherInterests.trim()].filter(Boolean).join(", ") || "General Sightseeing";

    try {
      const res = await fetchWithAuth(apiUrl("/api/v1/ai/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination,
          duration,
          travelers,
          interests: mergedInterests,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setItinerary(json.data);
      } else {
        const errorMsg =
          json.error?.message || json.message || "Failed to generate itinerary. Please try again.";
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      toastApiError(err, "Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("itinerary-print-area");
    if (!element) return;

    // Simple window.print() or canvas capture
    html2canvas(element, { scale: 2 }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `${destination.replace(/\s+/g, "-")}-itinerary.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-navy-800">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              AI Trip Planner
            </h1>
            <p className="text-gray-500 dark:text-navy-300 mt-2">
              Generate a fully customized, day-by-day travel plan instantly using advanced AI.
            </p>
          </div>
          <Link
            to="/"
            className="mt-4 md:mt-0 btn btn-secondary border border-gray-300 dark:border-navy-700 w-fit"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Planner Form Sidebar */}
          <div className="lg:col-span-1 bg-gray-50 dark:bg-navy-800/40 p-6 rounded-3xl border border-gray-200 dark:border-navy-800 h-fit">
            <h2 className="text-xl font-bold mb-6 text-navy-950 dark:text-white">
              Plan Your Holiday
            </h2>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-navy-300 mb-2">
                  Where do you want to go?
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kashmir, Dubai, Kerala"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-navy-700 outline-none dark:bg-navy-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-navy-300 mb-2">
                    Duration (Days)
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-3.5 text-gray-400" />
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-navy-700 outline-none dark:bg-navy-800 focus:ring-1 focus:ring-amber-500 appearance-none"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                        <option key={d} value={d}>
                          {d} Days
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-navy-300 mb-2">
                    Travelers
                  </label>
                  <div className="relative">
                    <FaUserFriends className="absolute left-3 top-3.5 text-gray-400" />
                    <select
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-navy-700 outline-none dark:bg-navy-800 focus:ring-1 focus:ring-amber-500 appearance-none"
                    >
                      {["1", "2", "3", "4", "5+"].map((t) => (
                        <option key={t} value={t}>
                          {t} Person(s)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-navy-300 mb-2">
                  What are your interests?
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestTags.map((tag) => {
                    const active = interests.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleInterestToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-gray-300 dark:border-navy-700 hover:border-amber-500"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-navy-300 mb-2">
                  Additional Preferences (Optional)
                </label>
                <textarea
                  placeholder="e.g. Vegetarian food only, budget accommodation, senior-citizen friendly pace..."
                  value={otherInterests}
                  onChange={(e) => setOtherInterests(e.target.value)}
                  rows="3"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-navy-700 outline-none dark:bg-navy-800 focus:ring-1 focus:ring-amber-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 py-3 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Generating Plan...
                  </>
                ) : (
                  <>
                    <FaPaperPlane /> Create Itinerary
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Itinerary Display Area */}
          <div className="lg:col-span-2">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-200 rounded-2xl text-center">
                ⚠️ {error}
              </div>
            )}

            {!itinerary && !loading && !error && (
              <div className="h-full min-h-[400px] border-2 border-dashed border-gray-300 dark:border-navy-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-gray-50/20 text-center">
                <div className="text-5xl mb-4">🔮</div>
                <h3 className="text-xl font-bold text-navy-950 dark:text-white">
                  Your Itinerary Awaits
                </h3>
                <p className="text-gray-500 dark:text-navy-300 max-w-sm mt-2 text-sm leading-relaxed">
                  Fill in your travel preferences and click "Create Itinerary". Our AI will build a
                  custom trip just for you.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[400px] border border-gray-200 dark:border-navy-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-white dark:bg-navy-900/50 text-center shadow-sm">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-100 dark:border-navy-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
                </div>
                <h3 className="text-lg font-bold text-navy-950 dark:text-white">
                  Curating Your Perfect Itinerary
                </h3>
                <p className="text-xs text-gray-500 dark:text-navy-300 mt-2 max-w-xs leading-relaxed animate-pulse">
                  Selecting local sightseeing highlights, spacing day schedules, and aggregating
                  travel warnings...
                </p>
              </div>
            )}

            {itinerary && (
              <div className="space-y-6">
                {/* Print Control Bar */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FaLightbulb /> Your plan is ready! Click "Download Plan" to save it as an
                    image.
                  </span>
                  <button
                    onClick={handlePrint}
                    className="btn btn-secondary border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 bg-white dark:bg-navy-900/50 text-xs px-4 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <FaPrint /> Download Plan
                  </button>
                </div>

                {/* Print Area */}
                <div
                  id="itinerary-print-area"
                  className="bg-white dark:bg-navy-900 p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-navy-800 shadow-sm space-y-6 text-left"
                >
                  {/* Summary Card */}
                  <div className="relative border-b dark:border-navy-800 pb-6">
                    <h2 className="text-2xl font-bold text-navy-950 dark:text-white mb-2">
                      {itinerary.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-navy-200 leading-relaxed mb-4">
                      {itinerary.summary}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-500 dark:text-navy-300 bg-gray-50 dark:bg-navy-800/40 p-4 rounded-xl">
                      <div>
                        📍 Destination:{" "}
                        <span className="text-navy-900 dark:text-white font-bold">
                          {itinerary.destination}
                        </span>
                      </div>
                      <div>
                        ⏱️ Duration:{" "}
                        <span className="text-navy-900 dark:text-white font-bold">
                          {itinerary.duration}
                        </span>
                      </div>
                      <div>
                        👥 Travelers:{" "}
                        <span className="text-navy-900 dark:text-white font-bold">
                          {travelers} People
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Itinerary Logs */}
                  <div className="space-y-8">
                    {itinerary.itinerary?.map((dayObj) => {
                      const morningText = dayObj.morning || "";
                      const afternoonText = dayObj.afternoon || "";
                      const eveningText = dayObj.evening || "";
                      const hasDetailedBlocks = morningText || afternoonText || eveningText;

                      return (
                        <div
                          key={dayObj.day}
                          className="bg-gray-50/60 dark:bg-navy-800/30 border border-gray-150 dark:border-navy-800/70 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          {/* Day Header */}
                          <div className="flex items-center gap-4 mb-5 border-b border-gray-200/50 dark:border-navy-800/60 pb-4">
                            <span className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md">
                              Day {dayObj.day}
                            </span>
                            <h4 className="text-lg md:text-xl font-bold text-navy-900 dark:text-white leading-tight">
                              {dayObj.title}
                            </h4>
                          </div>

                          {/* Short Day Overview */}
                          {dayObj.description && (
                            <p className="text-sm text-gray-500 dark:text-navy-300 italic mb-5 leading-relaxed">
                              {dayObj.description}
                            </p>
                          )}

                          {/* Time Blocks Timeline */}
                          {hasDetailedBlocks ? (
                            <div className="space-y-4 pl-2 md:pl-4 mb-5 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-[1.5px] before:bg-gray-200 dark:before:bg-navy-850">
                              {/* Morning Block */}
                              {morningText && (
                                <div className="flex items-start gap-4 relative">
                                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-250/50 dark:border-amber-900/50 flex items-center justify-center flex-shrink-0 z-10 font-bold text-lg shadow-sm">
                                    ☀️
                                  </div>
                                  <div className="bg-white dark:bg-navy-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-navy-800/40 shadow-sm flex-grow">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                                      Morning Activities
                                    </h5>
                                    <p className="text-xs md:text-sm text-gray-650 dark:text-navy-200 leading-relaxed">
                                      {morningText}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Afternoon Block */}
                              {afternoonText && (
                                <div className="flex items-start gap-4 relative">
                                  <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-250/50 dark:border-orange-900/50 flex items-center justify-center flex-shrink-0 z-10 font-bold text-lg shadow-sm">
                                    🌤️
                                  </div>
                                  <div className="bg-white dark:bg-navy-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-navy-800/40 shadow-sm flex-grow">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">
                                      Afternoon Activities
                                    </h5>
                                    <p className="text-xs md:text-sm text-gray-650 dark:text-navy-200 leading-relaxed">
                                      {afternoonText}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Evening Block */}
                              {eveningText && (
                                <div className="flex items-start gap-4 relative">
                                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-250/50 dark:border-blue-900/50 flex items-center justify-center flex-shrink-0 z-10 font-bold text-lg shadow-sm">
                                    🌙
                                  </div>
                                  <div className="bg-white dark:bg-navy-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-navy-800/40 shadow-sm flex-grow">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                                      Evening & Leisure
                                    </h5>
                                    <p className="text-xs md:text-sm text-gray-650 dark:text-navy-200 leading-relaxed">
                                      {eveningText}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Fallback if no blocks exist
                            <p className="text-sm text-gray-605 dark:text-navy-200 leading-relaxed mb-5 bg-white dark:bg-navy-900/60 p-4 rounded-2xl border border-gray-100 dark:border-navy-800/40">
                              {dayObj.description}
                            </p>
                          )}

                          {/* Footer Tags */}
                          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-gray-200/40 dark:border-navy-800/40">
                            {dayObj.activity && (
                              <span className="px-3 py-1.5 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-250/40 dark:border-amber-900/40 font-semibold flex items-center gap-1">
                                🎯 Highlight: {dayObj.activity}
                              </span>
                            )}
                            {dayObj.meals?.map((meal, mIdx) => (
                              <span
                                key={mIdx}
                                className="px-2.5 py-1 text-[10px] rounded-lg bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-navy-300 font-semibold uppercase tracking-wider"
                              >
                                🍽️ {meal}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Travel Tips & Price */}
                  <div className="border-t dark:border-navy-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-navy-950 dark:text-white mb-3 flex items-center gap-1.5 text-sm uppercase tracking-wider text-gray-500">
                        💡 Travel Advice
                      </h4>
                      <ul className="space-y-2">
                        {itinerary.travelTips?.map((tip, tIdx) => (
                          <li
                            key={tIdx}
                            className="text-xs text-gray-500 dark:text-navy-300 flex items-start gap-1.5"
                          >
                            <FaCheck className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 flex flex-col justify-center h-fit">
                      <h4 className="font-bold text-navy-900 dark:text-white mb-1 text-xs uppercase tracking-wider">
                        Estimated Pricing
                      </h4>
                      <p className="text-xl font-extrabold text-amber-500 mb-1">
                        {itinerary.estimatedCostInfo}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        *This estimate is calculated dynamically based on interests, duration, and
                        traveler counts. Actual quotes will vary depending on flights, seasonal
                        overrides, and availability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AiPlannerPage;
