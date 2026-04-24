const Package = require("../models/Package");
const cacheService = require("../utils/cache");
const logger = require("../utils/logger");

class PackageService {
  async getPackages(options = {}) {
    const { category, subcategory, limit = 20, page = 1 } = options;
    logger.info("Service: getPackages invoked", { category, subcategory, limit, page });

    // Check cache first
    const cacheKey = { category, subcategory, limit, page };
    const cached = await cacheService.getPackages(cacheKey);
    if (cached) {
      logger.info("Service: getPackages cache HIT", { cacheKey });
      return cached;
    }

    logger.info("Service: getPackages cache MISS. Querying database...", { cacheKey });
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      Package.find(filter).sort({ numericPrice: 1 }).skip(skip).limit(limit).lean(),
      Package.countDocuments(filter),
    ]);

    // Convert _id to id so frontend doesn't have to change
    const paginatedPackages = data.map((pkg) => {
      pkg.id = pkg._id;
      return pkg;
    });

    const result = {
      data: paginatedPackages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: parseInt(limit),
      },
    };

    // Cache the result
    await cacheService.setPackages(cacheKey, result);
    logger.info("Service: getPackages cached new result", { cacheKey });

    return result;
  }

  async getPackageById(id) {
    logger.info("Service: getPackageById invoked", { id });
    const pkg = await Package.findById(id).lean();
    if (pkg) {
      pkg.id = pkg._id;
    } else {
      logger.warn("Service: getPackageById not found", { id });
    }
    return pkg;
  }

  async getPackageCategories() {
    logger.info("Service: getPackageCategories invoked");
    return [
      {
        id: "domestic",
        name: "Domestic Packages",
        subcategories: [
          { id: "chardham", name: "Chardham" },
          { id: "south", name: "South India" },
          { id: "north", name: "North India" },
          { id: "kashmir", name: "Jammu & Kashmir" },
          { id: "bengal", name: "West Bengal" },
        ],
      },
      {
        id: "international",
        name: "International Packages",
        subcategories: [
          { id: "dubai", name: "Dubai" },
          { id: "singapore", name: "Singapore" },
          { id: "vietnam", name: "Vietnam" },
          { id: "thailand", name: "Thailand" },
          { id: "nepal", name: "Nepal" },
          { id: "andaman", name: "Andaman & Nicobar" },
        ],
      },
    ];
  }

  // Analytics methods
  async getPackageStats() {
    logger.info("Service: getPackageStats invoked");
    const totalPackages = await Package.countDocuments();

    const categoriesAggr = await Package.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const categoryStats = categoriesAggr.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const subcategoriesAggr = await Package.aggregate([
      { $group: { _id: "$subcategory", count: { $sum: 1 } } },
    ]);
    const subcategoryStats = subcategoriesAggr.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const ratingsAggr = await Package.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const averageRating = ratingsAggr[0]?.avgRating || 0;

    const topRatedData = await Package.find()
      .sort({ rating: -1 })
      .limit(5)
      .select("name rating")
      .lean();
    const topRated = topRatedData.map((pkg) => ({
      id: pkg._id,
      name: pkg.name,
      rating: pkg.rating,
    }));

    return {
      totalPackages,
      categories: categoryStats,
      subcategories: subcategoryStats,
      averageRating: averageRating.toFixed(1),
      topRated,
    };
  }

  // Admin mutation methods
  async createPackage(packageData) {
    logger.info("Service: createPackage invoked", { name: packageData.name });
    const pkg = new Package({
      ...packageData,
      numericPrice: parseInt(packageData.price?.replace(/[^\d]/g, "") || "0", 10),
    });
    await pkg.save();

    pkg.id = pkg._id;
    await cacheService.invalidatePackages();
    logger.info("Service: createPackage created and invalidating cache", { id: pkg.id });
    return pkg;
  }

  async updatePackage(id, packageData) {
    logger.info("Service: updatePackage invoked", { id, name: packageData.name });
    if (packageData.price) {
      packageData.numericPrice = parseInt(packageData.price.replace(/[^\d]/g, "") || "0", 10);
    }
    const pkg = await Package.findByIdAndUpdate(id, packageData, {
      new: true,
      runValidators: true,
    });
    if (pkg) {
      pkg.id = pkg._id;
      await cacheService.invalidatePackages();
      logger.info("Service: updatePackage succeeded and invalidating cache", { id });
    } else {
      logger.warn("Service: updatePackage failed, package not found", { id });
    }
    return pkg;
  }

  async deletePackage(id) {
    logger.info("Service: deletePackage invoked", { id });
    const pkg = await Package.findByIdAndDelete(id);
    if (pkg) {
      await cacheService.invalidatePackages();
      logger.info("Service: deletePackage succeeded and invalidating cache", { id });
    } else {
      logger.warn("Service: deletePackage failed, package not found", { id });
    }
    return pkg;
  }
}

module.exports = new PackageService();
