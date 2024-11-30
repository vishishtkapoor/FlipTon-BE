const User = require("../models/UserModel");
const alreadyReferred = require("./alreadyReferred");
const createUser = require("./createUser");
const handleError = require("./handleError");
const showMenu = require("./showMenu");

module.exports = handleReferral = async (ctx) => {
  try {
    let inviteId = ctx.payload;
    //If user clicked a forged link
    if (isNaN(inviteId)) {
      return await data.reply(
        "Sorry that link is invalid. Please check and try again."
      );
    }

    inviteId = parseInt(inviteId);

    const { id, first_name, last_name, username } = ctx.from;
    let chatId = id;

    //Find the invite link owner
    const referrer = await User.findOne({ chatId: inviteId });
    if (!referrer) {
      return await ctx.reply(
        "Sorry that link is invalid. Please check and try again."
      );
    }

    //If user clicked their own link
    if (inviteId === chatId) {
      return await ctx.reply("You cannot refer yourself.");
    }

    //Check if user already has an account
    const userExists = await User.findOne({ chatId });
    if (userExists) {
      return await ctx.reply("You already have an account.");
    }

    // Check if user has already been referred
    const alreadyReferredCheck = await alreadyReferred(chatId);

    //If an error prevented checking
    if (alreadyReferredCheck.error) {
      return await ctx.reply("An error occured.");
    }

    //If they've already been referred by someone
    if (alreadyReferredCheck.result) {
      return await ctx.reply("You already have an account.");
    }

    if (referrer.friends.length <= 12) {
      //cap it at 12 referrals max,
      //Process referral
      //Credit referrer(50 CRD)
      referrer.crowdBalance += 50;

      //Add to the referrer's referrals list
      const referee = {
        firstname: first_name || "",
        lastName: last_name || "",
        username: username || "No name",
        chatId,
      };
      referrer.friends.push(referee);
      referrer.markModified("friends");
      //Update referrer's account
      await referrer.save();

      //Create the new user's account
      const newUser = new User(referee);
      await newUser.save();
    }

    await showMenu(ctx, false); //Using false here, so that it will greet the user(even though their account already exists)
  } catch (error) {
    console.log(error);
    handleError(error, ctx);
  }
};
