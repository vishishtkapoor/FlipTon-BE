const mongoose = require("mongoose");

const ConnectedUserSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true, // Ensures one entry per user
  },
  socketId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const ConnectedUser = mongoose.model("ConnectedUser", ConnectedUserSchema);

module.exports = ConnectedUser;