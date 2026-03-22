const mongoose = require("mongoose");
const Package = require("./models/Package");
const packages = require("./seedData");
require("dotenv").config();

const seedDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/satyam-holidays";
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing packages
    await Package.deleteMany({});
    console.log("Cleared existing packages.");

    // Insert new packages
    await Package.insertMany(packages);
    console.log("Successfully seeded packages!");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exit(1);
  }
};

seedDB();
