const ConnectedUser = require("../models/ConnectedUserModel");

// Function to emit a message to a specific user by userId
const sendToClient = async (chatId, eventName, message) => {
  try {
    const user = await ConnectedUser.findOne({ chatId });
    if (user) {
      global.io.to(user.socketId).emit(eventName, message);
      console.log(message)
      console.log(`Message sent to user ${chatId}`);
    } else {
      console.log(`User ${chatId} is not connected`);
    }
  } catch (error) {
    console.error("Error sending message to user:", error);
  }
};

module.exports = sendToClient;