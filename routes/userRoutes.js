const express = require("express");
const handleServerError = require("../helpers/handleServerError");
const User = require("../models/UserModel");
const userRoutes = express.Router();
const getUserPhoto = require("../helpers/getPhoto");
const Game = require("../models/GameModel");
const sendToAllClients = require("../helpers/sendToAllClients");
const setName = require("../helpers/setName");
const getBalance = require("../helpers/getBalance");

// Fetch a user
userRoutes.get("/:chatId", async (req, res) => {
  try {
    let { chatId } = req.params;
    chatId = parseInt(chatId);

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, error: "Chat ID is required." });
    }

    const userDetails = await User.findOne({ chatId });
    if (!userDetails) {
      return res
        .status(404)
        .json({ success: false, error: "User does not exist." });
    }
    const photo = await getUserPhoto(chatId);
    const walletAddress = userDetails.walletAddress
      ? userDetails.walletAddress
      : null;

    let walletBalance = 0;
    if (walletAddress) {
      walletBalance = await getBalance(walletAddress);
    }

    res
      .status(200)
      .json({ success: true, data: { ...userDetails._doc, photo, walletBalance } });
  } catch (error) {
    handleServerError(error, res);
  }
});

// Create a game
userRoutes.post("/:chatId/newGame", async (req, res) => {
  const { wagerAmount, creatorChosenSide } = req.body;
  try {
    let { chatId } = req.params;
    chatId = parseInt(chatId);

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, error: "Chat ID is required." });
    }

    const userDetails = await User.findOne({ chatId });
    if (!userDetails) {
      return res
        .status(404)
        .json({ success: false, error: "User does not exist." });
    }

    //Check if user has an open game
    const userHasAnOpenGame = await Game.findOne({ player1Id: chatId });
    if (userHasAnOpenGame) {
      if (userHasAnOpenGame.status != "completed") {
        return res
          .status(409)
          .json({ success: false, error: "Please complete your open games." });
      }
    }

    //Create a new game

    let newGameDetails = {
      wagerAmount,
      creatorChosenSide,
      player1Id: chatId,
      player1Name: setName(userDetails),
    };

    const newGame = new Game(newGameDetails);
    await newGame.save();

    const dataForSocketClient = {
      ...newGameDetails,
      status: "waiting",
    };
    //Update user account state
    userDetails.waitingForPlayer2 = true;
    await userDetails.save();

    res.status(201).json({ success: true, data: "Game created successfully" });

    sendToAllClients("new_game", dataForSocketClient);
  } catch (error) {
    handleServerError(error, res);
  }
});

// Update wallet address
userRoutes.get("/:chatId/updateWalletAddress", async (req, res) => {
  try {
    let { chatId } = req.params;
    let { walletAddress } = req.body;

    chatId = parseInt(chatId);

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, error: "Chat ID is required." });
    }

    if (!walletAddress) {
      return res
        .status(400)
        .json({ success: false, error: "Wallet address is required." });
    }

    const userDetails = await User.findOne({ chatId });
    if (!userDetails) {
      return res
        .status(404)
        .json({ success: false, error: "User does not exist." });
    }

    userDetails.walletAddress = walletAddress;
    await userDetails.save();

    res.status(200).json({ success: true, message: "Wallet updated." });
  } catch (error) {
    handleServerError(error, res);
  }
});

module.exports = userRoutes;
