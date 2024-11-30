
module.exports = handleServerError = (error, res) => {
  console.log(error);
  res
    .status(500)
    .json({ success: false, error: error, message: "Server error" });
};
