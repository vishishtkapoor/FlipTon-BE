// Function to emit a message to all connected users
const sendToAllClients = async (eventName, message) => {
    console.log(message);
    try {
      global.io.emit(eventName, message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  module.exports = sendToAllClients;
  