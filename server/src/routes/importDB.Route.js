const express = require("express");
const router = express.Router();
const multer = require("multer");
const importAssets = require("../Controller/importDB.Controller");

// Cấu hình multer để lưu file tạm thời vào thư mục 'uploads/'
const upload = multer({ dest: 'uploads/' });

// Route import Excel
router.post("/import", upload.single("file"), importAssets);

module.exports = router;
