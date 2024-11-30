const { Telegraf } = require("telegraf");
require("dotenv/config");
const express = require("express");
const app = express();
const { default: mongoose } = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const Queue = require("queue-promise");
const helmet = require("helmet");
const rateLimitMiddleware = require("./middlewares/rateLimitMiddleware");
const limiter = require("./config/limiter");
const handleError = require("./helpers/handleError");
const User = require("./models/UserModel");
const createUser = require("./helpers/createUser");
const showMenu = require("./helpers/showMenu");
const authMiddleware = require("./auth/auth");
const http = require("http");
const handleReferral = require("./helpers/handleReferral");
const path = require("path");
const userRoutes = require("./routes/userRoutes");
const ConnectedUser = require("./models/ConnectedUserModel");
const socketIo = require("socket.io");
const gameRoutes = require("./routes/gameRoutes");
const getBalance = require("./helpers/getBalance");
const handleServerError = require("./helpers/handleServerError");
const setName = require("./helpers/setName");
const getPhoto = require("./helpers/getPhoto");

const server = http.createServer(app);
global.io = socketIo(server, {
  cors: {
    origin: "*", // Or specify the allowed origin(s) here
    methods: ["GET", "POST"],
  },
});

//MIDDLEWARES
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.use(bodyParser.urlencoded({ extended: false }));

// Apply security headers using Helmet
app.use(helmet());

// Apply rate limiting middleware to all routes except root '/'
app.use((req, res, next) => {
  if (req.path === "/") {
    // Skip rate limiting for the '/' route
    return next();
  }
  // Apply rate limiting
  limiter(req, res, next);
});

// global.redisClient = new Redis(process.env.REDIS_TOKEN);

// Middleware to check if an IP is blocked
app.use(rateLimitMiddleware);

app.use("/user", authMiddleware, userRoutes);
app.use("/game", authMiddleware, gameRoutes);
app.get("/leaderboard", authMiddleware, async (req, res) => {
  try {
    // Fetch required fields including chatId, name fields, and transactions
    const allUsers = await User.find({}, { firstname: 1, lastname: 1, username: 1, transactions: 1, chatId: 1 });

    // Use Promise.all to resolve all getUserPhoto promises in parallel
    const leaderboardInfo = await Promise.all(
      allUsers.map(async (eachUser) => {
        const userInfo = { name: setName(eachUser) };  // Concatenate user names

        // Calculate total amount won from "Credit" transactions
        const totalWinAmount = eachUser.transactions
          .filter((transaction) => transaction.transactionType === "Credit")
          .reduce((acc, transaction) => acc + transaction.amount, 0);

        userInfo.totalAmountWon = totalWinAmount;

        // Fetch user photo using chatId and attach it to the userInfo
        const userPhoto = await getPhoto(eachUser.chatId);
        userInfo.photo = userPhoto;
        userInfo.chatId = eachUser.chatId

        return userInfo;
      })
    );

    // Sort leaderboardInfo by totalAmountWon in descending order
    leaderboardInfo.sort((a, b) => b.totalAmountWon - a.totalAmountWon);

    res.status(200).json({ success: true, data: leaderboardInfo });
  } catch (error) {
    handleServerError(error, res);
  }
});

//Root route response
app.get("/", async (req, res) => {
  res.send("Hello World!");
});

const bot = new Telegraf(process.env.BOT_TOKEN);
// Create a queue instance
const queue = new Queue({
  concurrent: 30, // Process one request at a time
  interval: 1000, // Interval between dequeue operations (1 second)
});

bot.start(async (ctx) => {
  queue.enqueue(async () => {
    try {
      //If user clicked a referral link
      if (ctx.payload) {
        return await handleReferral(ctx);
      }

      const userExists = await User.findOne({ chatId: ctx.from.id });
      if (!userExists) {
        return await createUser(ctx);
      }
      await showMenu(ctx, true);
    } catch (error) {
      await handleError(error, ctx);
    }
  });
});

// Handle new WebSocket connections
global.io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // Register user on connection
  socket.on("register", async (chatId) => {
    console.log(chatId);
    try {
      // Save the userId and socketId to the database
      await ConnectedUser.findOneAndUpdate(
        { chatId },
        { socketId: socket.id },
        { upsert: true, new: true }
      );
      console.log(`User ${chatId} registered with socket ID ${socket.id}`);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    console.log("User disconnected", socket.id);
    try {
      // Remove the user from the database upon disconnection
      await ConnectedUser.findOneAndDelete({ socketId: socket.id });
      console.log(`User with socket ID ${socket.id} removed`);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

//Connect to DB
const URI = process.env.URI;

mongoose
  .connect(URI, { dbName: "user_db" })
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => console.log(err));

// Listen for and broadcast notifications
bot.on("message", async (ctx) => {
  const batchSize = 100; // Number of users to process in each batch
  let skip = 0;
  let hasMoreUsers = true;
  let count = 0;

  try {
    while (hasMoreUsers) {
      const usersBatch = await User.find().skip(skip).limit(batchSize);
      if (usersBatch.length > 0) {
        for (const user of usersBatch) {
          queue.enqueue(async () => {
            try {
              await sendNotification(ctx, user.chatId);
              ++count;
            } catch (error) {
              console.log("Error sending message\n", error);
            }
          });
        }
        skip += batchSize;
      } else {
        hasMoreUsers = false;
      }
    }
  } catch (error) {
    console.log("Notification error:\n", error);
  }
});

// Log a message when the bot is connected
bot.telegram
  .getMe()
  .then((botInfo) => {
    console.log(`Bot ${botInfo.username} is connected and running.`);
    bot.launch();
  })
  .catch((err) => {
    console.error("Error connecting bot:", err);
  });
