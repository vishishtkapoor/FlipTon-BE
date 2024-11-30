module.exports = handleError = async (error, ctx) => {
  console.log(error);
  if (ctx) {
    await ctx.reply("An error occured.");
  }
};
