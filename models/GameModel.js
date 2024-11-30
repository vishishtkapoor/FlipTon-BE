const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  wagerAmount: { type: Number, required: true },
  status: { type: String, required: true, default: "waiting" }, //waiting | ongoing | completed
  creatorChosenSide: { type: String, required: true }, //Head | Tail
  player1Id: { type: Number, required: true },
  player1Name: { type: String, required: true },
  player2Id: { type: Number },
  player2Name: { type: String },
});

const Game = mongoose.model("Game", GameSchema);

module.exports = Game;
