const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [100, "Email cannot exceed 100 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
    },
    mfaBackupCodes: {
      type: [String],
      default: [],
    },
    mfaOtp: {
      type: String,
    },
    mfaOtpExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  const storedPassword = this.password || "";
  const passwordMatch = await bcrypt.compare(candidatePassword, storedPassword);
  if (passwordMatch) {
    return true;
  }

  if (storedPassword === candidatePassword) {
    const upgradedPassword = await bcrypt.hash(candidatePassword, 10);
    await this.constructor.updateOne({ _id: this._id }, { $set: { password: upgradedPassword } });
    this.password = upgradedPassword;
    return true;
  }

  return false;
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
