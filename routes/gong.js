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

  firestore
    .collection("teams")
    .doc(teamID)
    .get()
    .then((doc) => {
      // TODO: this can be a batch write, updating teh gong history array and sending the notification
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
          console.log(value);
          var fcm_tokens = doc.data().fcm_tokens;
          var uids = doc.data().uid_team_members;

          for (var i = 0; i < uids.length; i++) {
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
                    res.status(201).json({ message: "success" });
                  })
                  .catch((error) => {
                    console.log("Error sending message:", error);
                  });
              });
          }

          // Old way of sending notifications
          // const message = {
          //   notification: {
          //     title: req.body.name,
          //     body: notificatinBody,
          //   },
          //   apns: {
          //     payload: {
          //       aps: {
          //         sound: "gong1.aiff",
          //       },
          //     },
          //   },
          //   tokens: fcm_tokens,
          // };

          // messaging
          //   .sendEachForMulticast(message)
          //   .then((response) => {
          //     // Response is a message ID string.
          //     console.log("Successfully sent message:", response.responses[0]);
          //     res.status(201).json({ message: "success" });
          //   })
          //   .catch((error) => {
          //     console.log("Error sending message:", error);
          //   });
        })
        .catch((error) => {});
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });
});

module.exports = router;
