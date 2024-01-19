const express = require("express");
const router = express.Router();
var admin = require("firebase-admin");

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

module.exports = router;