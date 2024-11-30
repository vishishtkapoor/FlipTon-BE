const { model, Schema } = require("mongoose");

const UserSchema = new Schema(
  {
    username: {
      type: String,
      default: null,
    },
    chatId: {
      type: Number,
      default: null,
    },
    firstname: {
      type: String,
      default: null,
    },
    lastname: {
      type: String,
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
    },
    friends: {
      type: [
        {
          firstname: String,
          lastname: String,
          username: String,
          chatId: Number,
        },
      ],
      default: [],
    },
    transactions: {
      type: [
        {
          transactionType: { type: String, required: true },
          amount: { type: Number, required: true },
          date: { type: String, required: true },
        },
      ],
      default: [],
    },
    waitingForPlayer2:{type:Boolean},
    waitingForPlayer1:{type:Boolean},
    player2HasJoined:{type:Boolean},
    player2Photo:{type:String},
    player1Photo:{type:String},
    player2Name:{type:String},
    player1Name:{type:String},
    gameOngoing:{type:Boolean},
    walletAddress:{type:String, default:""},
    walletBalance:{type:String},
    history: {
      type: [
        {
          opponentPhoto:String,
          won: { type: Boolean, required: true },
          opponent: { type: String, required: true },
          amount: { type: Number, required: true },
          date: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema);
module.exports = User;
