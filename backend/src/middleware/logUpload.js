// middleware/logUpload.js
module.exports = (req, res, next) => {
  console.log("\n🔵 [UPLOAD DEBUG] Incoming request");
  console.log("➡️ Method:", req.method);
  console.log("➡️ URL:", req.originalUrl);
  console.log("➡️ Content-Type:", req.headers["content-type"]);

  // Log basic fields early (req.body will be empty for multipart before multer parses)
  console.log("➡️ Did multer parse yet? body keys:", Object.keys(req.body || {}));

  next();
};
