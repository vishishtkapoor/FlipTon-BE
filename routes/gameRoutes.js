const express = require("express");
const Game = require("../models/GameModel");
const User = require("../models/UserModel");
const sendToClient = require("../helpers/sendToClient");
const gameRoutes = express.Router();
const getUserPhoto = require("../helpers/getPhoto");
const setName = require("../helpers/setName");
const sendToAllClients = require("../helpers/sendToAllClients");
const handleError = require("../helpers/handleError");
const ConnectedUser = require("../models/ConnectedUserModel");
require("dotenv/config");
const Queue = require("queue-promise");
const { Telegraf } = require("telegraf");
const transfer = require("../helpers/transfer");
const bot = new Telegraf(process.env.BOT_TOKEN);
// Create a queue instance
const queue = new Queue({
  concurrent: 30, // Process one request at a time
  interval: 1000, // Interval between dequeue operations (1 second)
});

gameRoutes.get("/all", async (req, res) => {
  try {
    const allGames = await Game.find();
    let openGames = [];
    openGames = allGames.filter((eachGame) => eachGame.status !== "completed");
    res.status(200).json({ success: true, data: openGames });
  } catch (error) {
    handleServerError(error, res);
  }
});

gameRoutes.post("/join/:chatId", async (req, res) => {
  const { player1Id } = req.body;
  const { chatId } = req.params;

  try {
    if (!player1Id) {
      return res
        .status(404)
        .json({ success: false, error: "Player 1 id is required" });
    }

    if (!chatId) {
      return res
        .status(404)
        .json({ success: false, error: "Chat id is required" });
    }

    const player2 = await User.findOne({ chatId });
    if (!player2) {
      return res
        .status(404)
        .json({ success: false, error: "Player 2 does not exist" });
    }

    const gameCreator = await User.findOne({ chatId: player1Id });
    if (!gameCreator) {
      return res
        .status(404)
        .json({ success: false, error: "Player 1 does not exist" });
    }

    const game = await Game.findOne({ player1Id });
    if (!game) {
      return res
        .status(404)
        .json({ success: false, error: "Player 1 has no open games" });
    }

    //Fetch Player 2 photo
    const player2Photo = await getUserPhoto(chatId);
    const player2Name = setName(player2);

    //Update player 1 in db
    gameCreator.player2HasJoined = true;
    gameCreator.player2Photo = player2Photo;
    gameCreator.player2Name = player2Name;
    await gameCreator.save();

    const dataForPlayer1Socket = {
      player2Name,
      player2Photo,
    };

    //Update player 1 in realtime
    sendToClient(player1Id, "player_2_joined", dataForPlayer1Socket);

    //Update player 2
    player2.waitingForPlayer1 = true;
    let player1Photo = await getUserPhoto(player1Id);
    let player1Name = setName(gameCreator);
    player2.player1Photo = player1Photo;
    player2.player1Name = player1Name;
    await player2.save();

    const dataForPlayer2Socket= {
      player1Photo,
      player1Name,
    };
    sendToClient(chatId, "player1Details", dataForPlayer2Socket);

    res.status(200).json({
      success: true,
      message: "Game joined successfully.",
    });

    //Update game in db
    game.status = "ongoing";
    game.player2Name = player2Name;
    game.player2Id = chatId;
    await game.save();

    //Update game status on gameLobby in realtime
    sendToAllClients("game_ongoing", { player1Id, player2Name });

    //Notify player 1 if they aren't online
    const player1IsOnline = await ConnectedUser.findOne({ chatId: player1Id });
    if (!player1IsOnline) {
      queue.enqueue(async () => {
        try {
          await bot.telegram.sendMessage(
            player1Id,
            `${player1Name}, please come online.\nPlayer 2 has joined your game, they're waiting for you to toss.`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Resume your game",
                      web_app: {
                        url: process.env.MINI_APP_URL,
                      },
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          handleError(error);
        }
      });
    }
  } catch (error) {
    handleServerError(error, res);
  }
});

gameRoutes.post("/:chatId/beginSession", async (req, res) => {
  const { chatId } = req.params;

  try {
    if (!chatId) {
      return res
        .status(404)
        .json({ success: false, error: "Chat id is required" });
    }

    const player1 = await User.findOne({ chatId });
    if (!player1) {
      return res
        .status(404)
        .json({ success: false, error: "User does not exist" });
    }

    const game = await Game.findOne({ player1Id: chatId });
    if (!game) {
      return res
        .status(404)
        .json({ success: false, error: "User has no open games" });
    }

    const player2 = await User.findOne({ chatId: game.player2Id });

    player1.gameOngoing = true;
    player1.waitingForPlayer2 = false;
    await player1.save();

    player2.waitingForPlayer1 = false;
    await player2.save();

    sendToClient(game.player2Id, "player_1_started", {
      wagerAmount: game.wagerAmount,
      creatorChosenSide: game.creatorChosenSide,
    });

    res.status(200).json({ success: true, message: "Game started" });
  } catch (error) {
    handleServerError(error, res);
  }
});

gameRoutes.post("/:chatId/tossStart", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(404)
        .json({ success: false, error: "Chat id is required" });
    }

    const game = await Game.findOne({ player1Id: chatId });
    if (!game) {
      return res
        .status(404)
        .json({ success: false, error: "User has has no open games" });
    }

    sendToClient(game.player2Id, "toss_started");
    res.status(200).json({ success: true, data: "Toss Started" });
  } catch (error) {
    handleServerError(error, res);
  }
});

gameRoutes.post("/:chatId/tossEnded", async (req, res) => {
  const { chatId } = req.params;
  const { tossResult } = req.body;

  try {
    if (!chatId) {
      return res
        .status(404)
        .json({ success: false, error: "Chat id is required" });
    }

    if (!tossResult) {
      return res
        .status(404)
        .json({ success: false, error: "Toss result is required" });
    }

    const gameCreator = await User.findOne({ chatId });
    if (!gameCreator) {
      return res
        .status(404)
        .json({ success: false, error: "User does not exist" });
    }

    const game = await Game.findOne({ player1Id: chatId });
    if (!game) {
      return res
        .status(404)
        .json({ success: false, error: "Player has no open game" });
    }

    const player2 = await User.findOne({ chatId: game.player2Id });

    const winner = game.creatorChosenSide == tossResult ? "player1" : "player2";
    let player1Photo = await getUserPhoto(game.player1Id);
    let player2Photo = await getUserPhoto(game.player2Id);
    if (winner == "player1") {
      //Update game history for player 1
      const newGameHistoryForPlayer1 = {
        won: true,
        opponent: game.player2Name,
        amount: game.wagerAmount * 2,
        date: new Date(),
        opponentPhoto: player1Photo,
      };
      gameCreator.history = [...gameCreator.history, newGameHistoryForPlayer1];

      //Update game history for player 2
      const newGameHistoryForPlayer2 = {
        won: false,
        opponent: game.player1Name,
        amount: game.wagerAmount,
        date: new Date(),
        opponentPhoto: player2Photo,
      };
      player2.history = [...player2.history, newGameHistoryForPlayer2];

      //Credit player 1
      if (gameCreator.walletAddress) {
        await transfer(gameCreator.walletAddress, `${game.wagerAmount * 2}`);
      }

      //Add to transaction history
      const newTransactionForPlayer1 = {
        transactionType: "Credit",
        amount: game.wagerAmount * 2,
        date: new Date(),
      };
      gameCreator.transactions = [
        ...gameCreator.transactions,
        newTransactionForPlayer1,
      ];

      const newTransactionForPlayer2 = {
        transactionType: "Debit",
        amount: game.wagerAmount,
        date: new Date(),
      };
      player2.transactions = [
        ...player2.transactions,
        newTransactionForPlayer2,
      ];

      //Remove game from gameLobby
      sendToAllClients("remove_game", chatId);

      //Update Clients in real-time
      //Update player 1
      //Notify player 1 if they aren't online
      const player1IsOnline = await ConnectedUser.findOne({ chatId });
      if (!player1IsOnline) {
        queue.enqueue(async () => {
          try {
            await bot.telegram.sendMessage(
              chatId,
              `Congrats ${game.player1Name}, You won a game.\n+${
                game.wagerAmount * 2
              } TON.`
            );
          } catch (error) {
            handleError(error);
          }
        });
      } else {
        sendToClient(chatId, "winner", {
          winningSide: tossResult,
          winnerId: chatId,
          winnerName: game.player1Name,
          loserName: game.player2Name,
        });
      }

      //Update player 2
      //Notify player 2 if they aren't online
      const player2IsOnline = await ConnectedUser.findOne({
        chatId: game.player2Id,
      });
      if (!player2IsOnline) {
        queue.enqueue(async () => {
          try {
            await bot.telegram.sendMessage(
              game.player2Id,
              `Sorry ${game.player2Name}, You lost a game.\n-${game.wagerAmount} TON.`
            );
          } catch (error) {
            handleError(error);
          }
        });
      } else {
        sendToClient(game.player2Id, "winner", {
          winningSide: tossResult,
          winnerId: chatId,
          winnerName: game.player1Name,
          loserName: game.player2Name,
        });
      }

      //Final account updates
      gameCreator.waitingForPlayer1 = false;
      gameCreator.player2HasJoined = false;
      gameCreator.gameOngoing = false;
      gameCreator.player2Photo = "";
      gameCreator.player2Name = "";

      player2.player1Name = "";
      player2.player1Photo = "";
      player2.waitingForPlayer1 = false;

      await gameCreator.save();
      await player2.save();

      console.log(newGameHistoryForPlayer1, newGameHistoryForPlayer2);
      //Delete game from db
      await Game.deleteOne({ player1Id: chatId });
      res.status(200).json({ success: true, message: "Acknowledged" });
    } else {
      //Update game history for player 2
      const newGameHistoryForPlayer2 = {
        won: true,
        opponent: game.player1Name,
        amount: game.wagerAmount * 2,
        date: new Date(),
        opponentPhoto: player1Photo,
      };
      player2.history = [...player2.history, newGameHistoryForPlayer2];

      //Update game history for player 1
      const newGameHistoryForPlayer1 = {
        won: false,
        opponent: game.player2Name,
        amount: game.wagerAmount,
        date: new Date(),
        opponentPhoto: player2Photo,
      };
      gameCreator.history = [...gameCreator.history, newGameHistoryForPlayer1];

      //Credit player 2
      if (player2.walletAddress) {
        await transfer(player2.walletAddress, `${game.wagerAmount * 2}`);
      }

      //Add to transaction history
      const newTransactionForPlayer2 = {
        transactionType: "Credit",
        amount: game.wagerAmount * 2,
        date: new Date(),
      };
      player2.transactions = [
        ...player2.transactions,
        newTransactionForPlayer2,
      ];

      const newTransactionForPlayer1 = {
        transactionType: "Debit",
        amount: game.wagerAmount,
        date: new Date(),
      };
      gameCreator.transactions = [
        ...gameCreator.transactions,
        newTransactionForPlayer1,
      ];

      //Remove game from gameLobby
      sendToAllClients("remove_game", chatId);

      //Update Clients in real-time
      //Update player 1
      //Notify player 1 if they aren't online
      const player1IsOnline = await ConnectedUser.findOne({ chatId });
      if (!player1IsOnline) {
        queue.enqueue(async () => {
          try {
            await bot.telegram.sendMessage(
              chatId,
              `Sorry ${game.player1Name}, You lost a game.\n-${game.wagerAmount} TON.`
            );
          } catch (error) {
            handleError(error);
          }
        });
      } else {
        sendToClient(chatId, "winner", {
          winningSide: tossResult,
          winnerId: player2.chatId,
          winnerName: game.player2Name,
          loserName: game.player1Name,
        });
      }

      //Update player 2
      //Notify player 2 if they aren't online
      const player2IsOnline = await ConnectedUser.findOne({
        chatId: player2.chatId,
      });
      if (!player2IsOnline) {
        queue.enqueue(async () => {
          try {
            await bot.telegram.sendMessage(
              player2.chatId,
              `Congrats ${game.player2Name}, You won a game.\n+${
                game.wagerAmount * 2
              } TON.`
            );
          } catch (error) {
            handleError(error);
          }
        });
      } else {
        sendToClient(player2.chatId, "winner", {
          winningSide: tossResult,
          winnerId: player2.chatId,
          winnerName: game.player2Name,
          loserName: game.player1Name,
        });
      }

      //Final account updates
      gameCreator.waitingForPlayer1 = false;
      gameCreator.player2HasJoined = false;
      gameCreator.gameOngoing = false;
      gameCreator.player2Photo = "";
      gameCreator.player2Name = "";

      player2.player1Name = "";
      player2.player1Photo = "";
      player2.waitingForPlayer1 = false;

      await gameCreator.save();
      await player2.save();

      console.log(newGameHistoryForPlayer1, newGameHistoryForPlayer2);

      //Delete game from db
      await Game.deleteOne({ player1Id: chatId });
      res.status(200).json({ success: true, message: "Acknowledged" });
    }
  } catch (error) {
    handleServerError(error, res);
  }
});

module.exports = gameRoutes;
