const mongoose = require("mongoose");

const BlockedIPSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
});

const BlockedIP = mongoose.model("BlockedIP", BlockedIPSchema);

module.exports = BlockedIP;