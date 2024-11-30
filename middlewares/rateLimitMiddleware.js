const BlockedIP = require("../models/BlockedIpModel");

module.exports = rateLimitMiddleware = async (req, res, next) => {
    const clientIP = req.ip;
    try {
      const blocked = await BlockedIP.findOne({ ip: clientIP });
      if (blocked) {
        return res.status(403).send("Your IP has been blocked.");
      }
      next();
    } catch (error) {
      console.error("Error checking IP block list:", error);
      res.status(500).send("Internal Server Error");
    }
  }