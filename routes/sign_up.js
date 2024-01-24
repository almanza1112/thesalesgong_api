const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");

var firestore = firebase.firestore();

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

router.post("/admin/complete_purchase", async (req, res) => {
  var teamMembers = req.body.team_members;

  // Removes the brackets surronding the move string array
  var trimmeedTeamMembers = teamMembers.slice(1, -1);

  // Convert string into array
  var teamMembersArray = trimmeedTeamMembers.split(",");

  var fcmTokenArray = [req.body.fcm_token];

  var completeTeamArray = [...teamMembersArray, req.body.email];

  var teamID = generateRandomOrder();

  const batch = firestore.batch();

  // Create teams
  const teamRef = firestore.collection("teams").doc(teamID);
  batch.set(teamRef, {
    emails: completeTeamArray,
    fcm_tokens: fcmTokenArray,
    team_ID: teamID,
  });

  const mailRef = firestore.collection("mail").doc(req.body.uid);
  batch.set(mailRef, {
    to: teamMembersArray,
    message: {
      subject: "You're Invited!",
      html:
        "<p>You’ve been invited to The Sales Gong<br/><br/>Your Team ID is: " +
        teamID +
        "<br/><br/>Now let’s hit that gong!!</p>",
    },
  });

  const userRef = firestore.collection("users").doc(req.body.uid);
  batch.set(userRef, {
    email: req.body.email,
    fcm_token: req.body.fcm_token,
    role: "admin",
    paid: true,
  });

  batch.commit().then(() => {
    res.status(201).json({ result: "success" });
  });
});

router.post("/team_member", async (req, res) => {
  // Find out if team exists and if user has already been added, meaning if email is already in team
  var teamID = req.body.team_ID;
  var email = req.body.email;
  firestore
    .collection("teams")
    .doc(teamID)
    .get()
    .then((doc) => {
      var emails = doc.data().emails;
      if (emails.includes(email)) {
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
            if (error.errorInfo.code == "auth/email-already-exists") {
              res
                .status(409)
                .json({
                  result: "failure",
                  message: error.errorInfo.message,
                  part: "creating user",
                });
            } else {
              res
                .status(500)
                .json({
                  result: "failure",
                  message: error.errorInfo.message,
                  part: "creating user",
                });
            }
          });
      } else {
        res.status(409).json({
          result: "failure",
          message: "User not in team",
          part: "finding team",
        });
      }
    })
    .catch((error) => {
      // TODO: Handle error better
      res
        .status(500)
        .json({ result: "failure", message: error, part: "finding team" });
    });
});

function generateRandomString(length) {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

function generateRandomOrder() {
  const numberOfOrders = 6;
  let concatenatedString = "";

  for (let i = 0; i < numberOfOrders; i++) {
    concatenatedString += generateRandomString(1); // Adjust the length as needed
  }

  return concatenatedString;
}

module.exports = router;
