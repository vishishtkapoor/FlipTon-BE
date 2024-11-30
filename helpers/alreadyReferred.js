const User = require("../models/UserModel");

module.exports = alreadyReferred = async (chatId) => {
  try {
    const user = await User.findOne({
      friends: { $elemMatch: { chatId: chatId } },
    });
    console.log(user)
    // Returns true if user has been referred by anyone, false otherwise
    return { error: false, result: !!user };
  } catch (error) {
    console.log("Error checking if user has been referred:", error);
    return { error: true };
  }
};