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

  var teamID = await generateTeamID();
  console.log(teamID);

  var batch = firestore.batch();

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
    team_ID: teamID,
  });

  var teamIDsRef = firestore.collection("teams").doc("team_IDs");
  batch.update(teamIDsRef, {
    team_IDs: firebase.firestore.FieldValue.arrayUnion(teamID),
  });

  batch.commit().then((result) => {
    console.log(result);
    res.status(201).json({ result: "success", team_ID: teamID });
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
      // Team exists, proceed to check if email is in team
      var emails = doc.data().emails;
      if (emails.includes(email)) {
        // Email is in team, proceed to create user
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
            // User is created successfully
            // Proceed to add user to Firestore + add user FCM token
            const batch = firestore.batch();

            const userRef = firestore.collection("users").doc(userRecord.uid);
            batch.set(userRef, {
              email: req.body.email,
              fcm_token: req.body.fcm_token,
              role: "team_member",
            });

            const teamRef = firestore.collection("teams").doc(teamID);
            batch.update(teamRef, {
              fcm_tokens: firebase.firestore.FieldValue.arrayUnion(
                req.body.fcm_token
              ),
            });

            batch
              .commit()
              .then(() => {
                res.status(201).json({ result: "success" });
              })
              .catch((error) => {
                console.log(3);
              });
          })
          .catch(function (error) {
            if (error.errorInfo.code == "auth/email-already-exists") {
              res.status(409).json({
                result: "failure",
                message: error.errorInfo.message,
                part: "creating user",
              });
            } else {
              console.log(error);
              res.status(500).json({
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

async function generateTeamID() {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  // Retrieve existing teamIDs from Firestore
  const docRef = firestore.collection("teams").doc("team_IDs");

  try {
    const doc = await docRef.get();

    let teamIDs;
    if (doc.exists) {
      teamIDs = doc.data().team_IDs;
    } else {
      teamIDs = [];
    }

    // Generate a unique team ID
    do {
      result = "";
      for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
      }
    } while (teamIDs.includes(result));

    return result;
  } catch (error) {
    console.error("Error generating team ID:", error);
  }
}

module.exports = router;
