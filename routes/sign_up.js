const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.post("/admin", async (req, res) => {
  firebase
    .auth()
    .createUser({
      email: req.body.email,
      emailVerified: false,
      password: req.body.password,
      displayName: req.body.name,
      disabled: false,
    })
    .then(function (userRecord) {
      res.status(201).json({ result: "success" });
    })
    .catch(function (error) {
      console.log("Error creating new user:", error.errorInfo.message);
      if (error.errorInfo.code == "auth/email-already-exists") {
        res
          .status(409)
          .json({ result: "failure", message: error.errorInfo.message });
      } else {
        res
          .status(500)
          .json({ result: "failure", message: error.errorInfo.message });
      }
    });
});

router.post("/admin/team_members", async (req, res) => {
  var teamMembers = req.body.team_members;

  // Removes the brackets surronding the move string array
  var trimmeedTeamMembers = teamMembers.slice(1, -1);

  // Convert string into array
  var teamMembersArray = trimmeedTeamMembers.split(",");

  firebase
    .firestore()
    .collection("mail")
    .doc(req.body.uid)
    .set({
      to: teamMembersArray,
      message: {
        subject: "Welcome to The Sales Gong",
        html: "<p>Welcome to The Sales Gong</p>",
      },
    })
    .then(function () {
      res.status(201).json({ result: "success" });
    })
    .catch(function (error) {
      console.log("Error creating new user:", error.errorInfo.message);
      res
        .status(500)
        .json({ result: "failure", message: error.errorInfo.message });
    });
});

module.exports = router;
