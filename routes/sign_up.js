const express = require("express");
const router = express.Router();
var admin = require("firebase-admin");

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.post("/admin", async (req, res) => {
      console.log("sign_up.js: req.body: ", req.body);

  res.status(201).json({ message: "success" });
});

module.exports = router;