const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");

var messaging = firebase.messaging();
var firestore = firebase.firestore();

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.post("/hit", async (req, res) => {
  console.log(req.body);
  var teamID = req.body.team_ID;
  var notificatinBody = 'Hit The Sales Gong!\n"' + req.body.message + '"';
  var serverTimestamp = req.body.timestamp;

  firestore
    .collection("teams")
    .doc(teamID)
    .get()
    .then((doc) => {
      firestore
        .collection("teams")
        .doc(teamID)
        .update({
          gong_history: firebase.firestore.FieldValue.arrayUnion({
            message: req.body.message,
            name: req.body.name,
            timestamp: serverTimestamp,
          }),
        })
        .then((value) => {
          var fcm_tokens = doc.data().fcm_tokens;
          const message = {
            notification: {
              title: req.body.name,
              body: notificatinBody,
              
            },
            tokens: fcm_tokens,
          };

          messaging
            .sendEachForMulticast(message)
            .then((response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
              res.status(201).json({ message: "success" });
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        })
        .catch((error) => {});
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
});

module.exports = router;
