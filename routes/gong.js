const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");

var messaging = firebase.messaging();
var firestore = firebase.firestore();

router.get("/", async (req, res) => {
  res.status(201).json({ message: "success" });
});

router.post("/hit", async (req, res) => {
  var teamID = req.body.team_ID;
  var notificatinBody = 'Hit The Sales Gong!\n"' + req.body.message + '"';
  var serverTimestamp = req.body.timestamp;
  var gongSenderUid = req.body.uid;

  firestore
    .collection("teams")
    .doc(teamID)
    .get()
    .then((doc) => {
      // TODO: this can be a batch write, updating the gong history array and sending the notification
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
          var uids = doc.data().uid_team_members;

          if (uids.length > 1) {
            // Get Success Message
            firestore
              .collection("success_messages")
              .doc("messages")
              .get()
              .then((doc) => {
                var success_messages = doc.data().success_messages;
                var successMessage =
                  success_messages[
                    Math.floor(Math.random() * success_messages.length)
                  ];
                for (var i = 0; i < uids.length; i++) {
                  if (uids[i] != req.body.uid) {
                    firebase
                      .firestore()
                      .collection("users")
                      .doc(uids[i])
                      .get()
                      .then((doc) => {
                        var gong_num = doc.data().notification_sound;
                        var fcm_token = doc.data().fcm_token;

                        const message = {
                          notification: {
                            title: req.body.name,
                            body: notificatinBody,
                          },
                          apns: {
                            payload: {
                              aps: {
                                sound: "gong" + gong_num + ".aiff",
                              },
                            },
                          },
                          android: {
                            notification: {
                              channel_id: "basic_channel" + gong_num,
                              sound: "gong" + gong_num + ".mp3",
                            },
                          },
                          token: fcm_token,
                        };

                        messaging
                          .send(message)
                          .then((response) => {
                            console.log("Successfully sent message:", response);

                            res.status(201).json({ message: successMessage });
                          })
                          .catch((error) => {
                            console.log("Error sending message:", error);
                            res.status(409).json({ message: error });
                          });
                      });
                  }
                }
              })
              .catch((error) => {});
          } else {
            res.status(400).json({ message: "No other team members." });
          }
        })
        .catch((error) => {});
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
});

module.exports = router;
