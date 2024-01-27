const express = require("express");
const router = express.Router();
var firebase = require("firebase-admin");
const fetch = require("node-fetch");

var messaging = firebase.messaging();

var accessToken = "08bfd8eda5f0afa26a73143f06e30aa98a79095e";
var url = "fcm.googleapis.com/v1/projects/the-sales-gong/messages:send";

router.get("/", async (req, res) => {
  fetch(url, {
    method: "POST",
    headers: {
      Host: "fcm.googleapis.com",
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken,
    },
    body: {
      message: {
        token:
          "fS5WZFvjuU6DgR5mTqqY-m:APA91bG5e3chwTKRlmpoHJinXX7giQRl-9-j6V7cuMQVL1BMYeYYmjxT3uo7kO5F_nZbMxYyiknS7_6B3njCQf2ugRzhkL3PQDBturmqgQOSKYne9rsO3rKZ_6eZo3iMErmRAw7T4Zxy",
        notification: {
          title: "Breaking News",
          body: "New news story available.",
        },
        data: {
          story_id: "story_12345",
        },
      },
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
    });
  //res.status(201).json({ message: "success" });
});

router.post("/hit", async (req, res) => {
  console.log("hit");
  const registrationToken =
    //"cs_eLqJd90-5gl3qnVAQUQ:APA91bFzBojoAZdHQHB4zqlqtxVk7E7y9AJoQrPAr287F-JxN0kmv9EgoZv4iCoGtt67ptSZJfP2aHIbiyDJVBWD61Tg24NgTj2JfSKWFlg_zSwshKv1V0bffEWHs31Ozas0g8gcAavA";
  "fS5WZFvjuU6DgR5mTqqY-m:APA91bG5e3chwTKRlmpoHJinXX7giQRl-9-j6V7cuMQVL1BMYeYYmjxT3uo7kO5F_nZbMxYyiknS7_6B3njCQf2ugRzhkL3PQDBturmqgQOSKYne9rsO3rKZ_6eZo3iMErmRAw7T4Zxy";

  const message = {
    notification: {
      title: "850",
      body: "2:45",
    },
    token: registrationToken,
  };

  // Send a message to the device corresponding to the provided
  // registration token.

  messaging
    .send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch((error) => {
      console.log("Error sending message:", error);
    });
});

module.exports = router;
