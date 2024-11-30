const { Telegraf } = require("telegraf");
const axios = require("axios");
const handleError = require("./handleError");
const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async function getUserPhoto(chatId) {
  try {
    const photos = await bot.telegram.getUserProfilePhotos(chatId);

    if (photos.total_count > 0) {
      // Get the file ID of the first photo in the first set of photos
      const fileId = photos.photos[0][0].file_id;

      // Get the file info
      const file = await bot.telegram.getFile(fileId);

      // Construct the URL to download the photo
      const photoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Download the photo and convert to Base64 string
      const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
      const base64String = Buffer.from(response.data, 'binary').toString('base64');

      return `data:image/jpeg;base64,${base64String}`;
    } else {
      return null;
    }
  } catch (err) {
    handleError(err);
    return null; // Optionally return null or an appropriate error message
  }
};
