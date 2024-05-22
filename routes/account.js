const e = require("express");
const express = require("express");
const router = express.Router();
var admin = require("firebase-admin");
var firebaseAuth = admin.auth();
var firestore = admin.firestore();

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.post("/change_password", async (req, res) => {
  admin
    .auth()
    .updateUser(req.body.uid, {
      password: req.body.password,
    })
    .then((userRecord) => {
      res.status(201).json({ message: "success" });
    })
    .catch((error) => {
      console.log("Error updating user:", error);
      res.status(500).json({ message: "failure", error: error });
    });
});

router.post("/change_email", async (req, res) => {
  var oldEmail = req.body.old_email;
  var newEmail = req.body.new_email;
  var teamID = req.body.team_ID;
  var uid = req.body.uid;
  // First check is email is being used by another user
  firebaseAuth
    .getUserByEmail(newEmail)
    .then((userRecord) => {
      // The email is already in use
      res
        .status(409)
        .json({ message: "failure", error: "Email already in use" });
    })
    .catch((error) => {
      // The email is not in use
      // Update the user's email
      firebaseAuth
        .updateUser(uid, {
          email: newEmail,
        })
        .then((userRecord) => {
          // Email updated successfully
          // Send a verification email to the new email
          // Batch operations to update all instances of emails in Firestore

          // Read information from teams collection, get email from email array, registered_team_members array
          firestore
            .collection("teams")
            .doc(teamID)
            .get()
            .then((doc) => {
              var emailsArray = doc.data().emails;
              var registeredTeamMembersArray =
                doc.data().registered_team_members;

              // Get index of old email in emails array
              var oldEmailIndex = emailsArray.indexOf(oldEmail);
              var oldRegisteredTeamMemberIndex =
                registeredTeamMembersArray.findIndex(
                  (user) => user.email === oldEmail
                );

              emailsArray[oldEmailIndex] = newEmail;
              registeredTeamMembersArray[oldRegisteredTeamMemberIndex].email =
                newEmail;

              var batch = firestore.batch();
              var userRef = firestore.collection("users").doc(uid);
              batch.update(userRef, { email: newEmail });

              var teamRef = firestore.collection("teams").doc(teamID);

              batch.update(teamRef, {
                emails: emailsArray,
                registered_team_members: registeredTeamMembersArray,
              });

              batch
                .commit()
                .then(() => {
                  res.status(201).json({ message: "success" });
                })
                .catch((error) => {
                  console.log("Error updating Firestore:", error);
                  res.status(500).json({ message: "failure", error: error });
                });
            })
            .catch((error) => {
              res.status(500).json({ message: "failure", error: error });
            });
        })
        .catch((error) => {
          console.log("Error updating user:", error);
          res.status(500).json({ message: "failure", error: error });
        });
    });
});

router.post("/change_name", async (req, res) => {
  var teamID = req.body.team_ID;
  var uid = req.body.uid;
  var newName = req.body.new_name;
  var email = req.body.email;

  firebaseAuth
    .updateUser(uid, {
      displayName: newName,
    })
    .then((userRecord) => {
      // Update user's name in Firestore

      // First get doc of team
      firestore
        .collection("teams")
        .doc(teamID)
        .get()
        .then((doc) => {
          // Update user's name in teams + users collection
          var registeredTeamMembersArray = doc.data().registered_team_members;

          var registeredTeamMemberIndex = registeredTeamMembersArray.findIndex(
            (user) => user.email === email
          );

          registeredTeamMembersArray[registeredTeamMemberIndex].name = newName;

          firestore
            .collection("teams")
            .doc(teamID)
            .update({
              registered_team_members: registeredTeamMembersArray,
            })
            .then(() => {
              res.status(201).json({ message: "success" });
            })
            .catch((error) => {
              res.status(500).json({ message: "failure", error: error });
            });
        })
        .catch((error) => {
          res.status(500).json({ message: "failure", error: error });
        });
    })
    .catch((error) => {
      res.status(500).json({ message: "failure", error: error });
    });
});

router.post("/add_teammember", async (req, res) => {
  var teamID = req.body.team_ID;
  var emails = req.body.emails;
  var teamName = req.body.team_name;

  // Removes the brackets surronding the emails string array
  var trimmedEmailsString = emails.slice(1, -1);

  // Convert string into array
  var emailsArray = trimmedEmailsString.split(", ");

  const batch = firestore.batch();
  const emailRef = firestore.collection("teams").doc(teamID);
  batch.update(emailRef, {
    emails: admin.firestore.FieldValue.arrayUnion(...emailsArray),
  });

  const mailTeamRef = firestore.collection("mail").doc(teamID);
  batch.set(mailTeamRef, {
    to: emailsArray,
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

  batch.commit().then((result) => {
    res.status(201).json({ result: "success" });
  });
});

// This route is used to check if an email is already in use
router.post("/check_email", async (req, res) => {
  var email = req.body.email;
  firebaseAuth
    .getUserByEmail(email)
    .then((userRecord) => {
      res
        .status(409)
        .json({ message: "failure", error: "Email already in use" });
    })
    .catch((error) => {
      res.status(201).json({ message: "success" });
    });
});

router.post("/admin/edit_email", async (req, res) => {
  var oldEmail = req.body.old_email;
  var newEmail = req.body.new_email;
  var uid = req.body.uid;
  var teamID = req.body.team_ID;

  // First check if email already exists
  firebaseAuth
    .getUserByEmail(newEmail)
    .then((userRecord) => {
      // The email is already in use
      res
        .status(409)
        .json({ message: "failure", error: "Email already in use" });
    })
    .catch((error) => {
      // The email is not in use
      // Proceed to check the teams doc in Firestore for user
      firestore
        .collection("teams")
        .doc(teamID)
        .get()
        .then((doc) => {
          var teamName = doc.data().team_name;
          // Check if user is regesitered in the team
          var registeredTeamMembersArray = doc.data().registered_team_members;
          var oldEmailIndex = registeredTeamMembersArray.findIndex(
            (user) => user.email === oldEmail
          );
          if (oldEmailIndex === -1) {
            // User is not registered in the team
          } else {
            // user is registered in the team, remove him from list 'registered_team_members'
            registeredTeamMembersArray.splice(oldEmailIndex, 1);
          }

          // Check if user is in the emails array
          var emailsArray = doc.data().emails;
          var oldEmailIndex2 = emailsArray.indexOf(oldEmail);
          if (oldEmailIndex2 === -1) {
            // User is not in the emails array
          } else {
            // User is in the emails array, remove him
            emailsArray.splice(oldEmailIndex2, 1);
            // Add new email/user
            emailsArray.push(newEmail);
          }

          // Add new lists to update body
          var update = {
            registered_team_members: registeredTeamMembersArray,
            emails: emailsArray,
          };

          // Create batch operation to update the teams doc and also send invitation email to new email
          var batch = firestore.batch();

          const teamRef = firestore.collection("teams").doc(teamID);
          batch.update(teamRef, update);

          const mailTeamRef = firestore.collection("mail").doc(teamID);
          batch.set(mailTeamRef, {
            to: newEmail,
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

          batch.commit().then((result) => {
            res.status(201).json({ result: "success", team_ID: teamID });
          }).catch((error) => {
            res.status(500).json({ message: "failure", error: error });
          });
        });
    });
});

module.exports = router;
