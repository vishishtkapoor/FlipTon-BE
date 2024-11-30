const { default: rateLimit } = require("express-rate-limit");
const BlockedIP = require("../models/BlockedIpModel");

// Define rate limiting rules
module.exports = limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  onLimitReached: async (req, res, options) => {
    try {
      const ip = req.ip;
      // Add IP to blocked list
      await BlockedIP.create({ ip });
    } catch (error) {
      console.error("Error blocking IP:", error);
    }
  },
});
