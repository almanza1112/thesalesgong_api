const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");

var firestore = firebase.firestore();

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.get("/email_check", async (req, res) => {
  firebase
    .auth()
    .getUserByEmail(req.query.email)
    .then(function (userRecord) {
      res.status(409).json({ result: "failure", message: "Email exists" });
    })
    .catch(function (error) {
      if (error.errorInfo.code == "auth/invalid-email") {
        // The email address is improperly formatted
        res
          .status(409)
          .json({ result: "success", message: error.errorInfo.code });
      } else if (error.errorInfo.code == "auth/user-not-found") {
        // User not found
        res
          .status(200)
          .json({ result: "success", message: "Email does not exist" });
      }
    });
});

router.post("/admin/complete_purchase", async (req, res) => {
  firebase
    .auth()
    .createUser({
      email: req.body.email,
      emailVerified: false,
      password: req.body.password,
      displayName: req.body.name,
      disabled: false,
    })
    .then(async function (userRecord) {
      var teamMembers = req.body.team_members;
      var adminEmail = req.body.email;
      var teamName = req.body.team_name;
      

      // Removes the brackets surronding the move string array
      var trimmeedTeamMembers = teamMembers.slice(1, -1);

      // Convert string into array
      var teamMembersArray = trimmeedTeamMembers.split(",");

      var fcmTokenArray = [req.body.fcm_token];

      var completeTeamArray = [...teamMembersArray, req.body.email];

      var registeredTeamMembersArray = [
        { name: req.body.name, email: req.body.email, role: "admin" },
      ];

      var teamID = await generateTeamID();

      var batch = firestore.batch();

      // Create teams
      const teamRef = firestore.collection("teams").doc(teamID);
      batch.set(teamRef, {
        emails: completeTeamArray,
        fcm_tokens: fcmTokenArray,
        registered_team_members: registeredTeamMembersArray,
        uid_team_members: [userRecord.uid],
        gong_history: [],
        team_ID: teamID,
        team_name: teamName,
        total_team_members_allowed: completeTeamArray.length,
      });

      const mailAdminRef = firestore.collection("mail").doc(userRecord.uid);
      batch.set(mailAdminRef, {
        to: adminEmail,
        message: {
          subject: "Welcome to The Sales Gong!",
          html:
            '<p>Thank you for signing up for The Sales Gong!<br/><br/>We have sent the invites to your team members so they can install the app. If they don’t receive the notification, they can go to <a href="https://thesalesgong.com">www.thesalesgong.com</a> and install it on their device.' +
            "<br/><br/>Your team ID is: " +
            teamID +
            "<br/><br/>You will be charged $5.00 per month per user on your team." +
            "<br/><br/>You can add or disable users within your app settings at any time." +
            "<br/><br/>If you have any questions, please do not hesitate to reach out to us at hello@thesalesgong.com." +
            "<br/><br/>Happy selling!!</p>",
        },
      });

      const mailTeamRef = firestore.collection("mail").doc(teamID);
      batch.set(mailTeamRef, {
        to: teamMembersArray,
        message: {
          subject: "You're Invited!",
          html:
            "<p>Hello!<br/><br/>You’ve been invited to The Sales Gong for " +
            teamName +
            "!" +
            "<br/><br/>Go to www.thesalesgong.com to install the app on your device to join the celebration." +
            "<br/><br/>Your Team ID is: " +
            teamID +
            "<br/><br/>Now let’s close some deals and hit that gong!!</p>",
        },
      });

      const userRef = firestore.collection("users").doc(userRecord.uid);
      batch.set(userRef, {
        email: req.body.email,
        fcm_token: req.body.fcm_token,
        role: "admin",
        paid: true,
        team_ID: teamID,
        team_name: teamName,
        notification_sound: "1",
        subscription: {
          status: "active",
          total_team_members_allowed: completeTeamArray.length,
          type: req.body.subscription_type,
        }
      });

      var teamIDsRef = firestore.collection("teams").doc("team_IDs");
      batch.update(teamIDsRef, {
        team_IDs: firebase.firestore.FieldValue.arrayUnion(teamID),
      });

      batch.commit().then((result) => {
        res.status(201).json({ result: "success", team_ID: teamID });
      });
    })
    .catch(function (error) {
      console.log("Error creating new user:", error.errorInfo);
      if (
        error.errorInfo.code == "auth/email-already-exists" ||
        error.errorInfo.code == "auth/invalid-email"
      ) {
        res
          .status(409)
          .json({ result: "failure", message: error.errorInfo.code });
      } else {
        res
          .status(500)
          .json({ result: "failure", message: error.errorInfo.message });
      }
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
      var teamName = doc.data().team_name;
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
              team_ID: teamID,
              team_name: teamName,
              notification_sound: "1",
            });

            const teamRef = firestore.collection("teams").doc(teamID);
            batch.update(teamRef, {
              fcm_tokens: firebase.firestore.FieldValue.arrayUnion(
                req.body.fcm_token
              ),
              registered_team_members: firebase.firestore.FieldValue.arrayUnion(
                {
                  name: req.body.name,
                  email: req.body.email,
                  role: "team_member",
                }
              ),
              uid_team_members: firebase.firestore.FieldValue.arrayUnion(
                userRecord.uid
              ),
            });

            batch
              .commit()
              .then(() => {
                res
                  .status(201)
                  .json({ result: "success", team_name: teamName });
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
        // Team exists but email is not in team
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
