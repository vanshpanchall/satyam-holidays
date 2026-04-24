import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaClock,
  FaStar,
  FaTimes,
  FaSearch,
  FaFileImage,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth } from "../../config/siteConfig";
import PackageFlyer from "../../components/PackageFlyer";

const AdminPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [flyerPackage, setFlyerPackage] = useState(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl("/api/packages?limit=100"));
      const json = await res.json();
      if (json.success) {
        setPackages(json.data || []);
      }
    } catch (err) {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this package?")) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/packages/${id}`), { method: "DELETE" });
      if (res.ok) {
        toast.success("Package deleted");
        fetchPackages();
      } else {
        toast.error("Delete failed");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const filteredPackages = packages
    .filter((p) => activeCategory === "all" || p.category === activeCategory)
    .filter(
      (p) =>
        searchTerm === "" ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Packages</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage travel packages</p>
        </div>
        <button
          onClick={() => {
            setEditingPackage(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
        >
          <FaPlus /> Add Package
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          <div className="flex gap-1">
            {["all", "domestic", "international"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeCategory === cat
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => (
            <motion.div
              key={pkg._id || pkg.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group"
            >
              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={
                    pkg.image
                      ? pkg.image.startsWith("/uploads")
                        ? apiUrl(pkg.image)
                        : pkg.image
                      : "https://via.placeholder.com/400x200?text=No+Image"
                  }
                  alt={pkg.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-full capitalize">
                    {pkg.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white text-sm font-bold rounded-full">
                    {pkg.price}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 text-white text-sm flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-amber-400" /> {pkg.location}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 dark:text-white truncate mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {pkg.description}
                </p>

                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <FaClock className="text-amber-500" /> {pkg.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaStar className="text-amber-400" /> {pkg.rating}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFlyerPackage(pkg)}
                    className="px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                    title="Generate Flyer"
                  >
                    <FaFileImage />
                  </button>
                  <button
                    onClick={() => {
                      setEditingPackage(pkg);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pkg._id || pkg.id)}
                    className="px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400">
            <p className="text-lg mb-4">No packages found</p>
            <button
              onClick={() => {
                setEditingPackage(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm"
            >
              <FaPlus /> Create Package
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <PackageModal
            pkg={editingPackage}
            onClose={() => setIsModalOpen(false)}
            onSaved={() => {
              setIsModalOpen(false);
              fetchPackages();
            }}
          />
        )}
        {flyerPackage && <PackageFlyer pkg={flyerPackage} onClose={() => setFlyerPackage(null)} />}
      </AnimatePresence>
    </div>
  );
};

const PackageModal = ({ pkg, onClose, onSaved }) => {
  const [formData, setFormData] = useState(
    pkg || {
      name: "",
      category: "domestic",
      subcategory: "",
      duration: "",
      price: "",
      location: "",
      description: "",
      visa: "No Visa Required",
      image: "",
      rating: 4.5,
      reviews: 0,
      highlights: [],
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightInput, setHighlightInput] = useState("");
  const [imagePreview, setImagePreview] = useState(pkg?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      const res = await fetchWithAuth(apiUrl("/api/packages/upload-image"), {
        method: "POST",
        body: formDataUpload,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFormData((prev) => ({ ...prev, image: json.imageUrl }));
        toast.success("Image uploaded successfully");
      } else {
        toast.error(json.message || "Image upload failed");
        setImagePreview(pkg?.image || "");
      }
    } catch (err) {
      toast.error("Failed to upload image");
      setImagePreview(pkg?.image || "");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const getImageSrc = () => {
    if (imagePreview && imagePreview.startsWith("data:")) return imagePreview;
    if (imagePreview && imagePreview.startsWith("/uploads")) return apiUrl(imagePreview);
    if (imagePreview && imagePreview.startsWith("http")) return imagePreview;
    if (formData.image && formData.image.startsWith("/uploads")) return apiUrl(formData.image);
    if (formData.image && formData.image.startsWith("http")) return formData.image;
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = pkg ? apiUrl(`/api/packages/${pkg._id || pkg.id}`) : apiUrl("/api/packages");
      const res = await fetchWithAuth(url, {
        method: pkg ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Package ${pkg ? "updated" : "created"}`);
        onSaved();
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        highlights: [...(prev.highlights || []), highlightInput.trim()],
      }));
      setHighlightInput("");
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500";

  const currentImgSrc = getImageSrc();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {pkg ? "Edit Package" : "New Package"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <FaTimes className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Package Image *
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                  : currentImgSrc
                    ? "border-slate-200 dark:border-slate-700"
                    : "border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {currentImgSrc ? (
                <div className="relative group">
                  <img
                    src={currentImgSrc}
                    alt="Package preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <div className="text-white text-center">
                      <FaFileImage className="text-3xl mx-auto mb-2" />
                      <p className="text-sm font-medium">Click or drag to replace</p>
                    </div>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <FaFileImage className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        JPEG, PNG, WebP, GIF — max 5MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name *
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClass}
                placeholder="Package name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subcategory *
              </label>
              <input
                required
                type="text"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., chardham"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Duration *
              </label>
              <input
                required
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., 5 Days / 4 Nights"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Price *
              </label>
              <input
                required
                type="text"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., ₹25,999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location *
              </label>
              <input
                required
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., Uttarakhand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Visa
              </label>
              <input
                type="text"
                name="visa"
                value={formData.visa}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., No Visa Required"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description *
            </label>
            <textarea
              required
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={inputClass}
              placeholder="Package description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Highlights
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addHighlight())}
                className={inputClass}
                placeholder="Add highlight"
              />
              <button
                type="button"
                onClick={addHighlight}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.highlights?.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-sm"
                >
                  {h}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        highlights: prev.highlights.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : pkg ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminPackages;
