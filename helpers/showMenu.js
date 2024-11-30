
const handleError = require("./handleError");
require("dotenv/config");

const showMenu = async (ctx, alreadyExists) => {
  const { username, first_name, last_name } = ctx.from;

  try {
    // Escape only specific characters that cause issues in Markdown formatting
    const escapeMarkdown = (text) => text.replace(/([_*[\]()])/g, '\\$1');

    // Use the escape function only on the name variable
    const name = escapeMarkdown(username || first_name || last_name || "Friend");

    // Create the message with proper markdown syntax
    const message = alreadyExists
      ? `Hi, ${name}👋\nHow are you doing?\nWelcome back to *Flipton*🥳😎\n\nClick the button to continue flipping!`
      : `Hey there, ${name}👋\nWelcome to *Flipton*🥳😎!`;

    // Send the message
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Start Flipping",
              web_app: {
                url: process.env.MINI_APP_URL,
              },
            },
          ],
        ],
      },
    });
  } catch (error) {
    // Handle any errors using the provided handleError function
    handleError(error, ctx);
  }
};

// Export the showMenu function
module.exports = showMenu;
