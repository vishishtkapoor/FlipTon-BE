const User = require("../models/UserModel");
const showMenu = require("./showMenu");

module.exports = createUser = async (ctx) => {
  const { first_name, last_name, username, id } = ctx.from;
  try {
    let newUserData = {
      firstName: first_name || null,
      lastName: last_name || null,
      username: username || "No name",
      chatId:id
    };
    const newUser = new User(newUserData);
    await newUser.save();
 
      //Update the leaderboard in realtime, (assuming users are less than 500). And if they exceed 500, a limit is already integrated on the frontend

    await showMenu(ctx, false);
  } catch (error) {
    handleError(error, ctx);
  }
};
