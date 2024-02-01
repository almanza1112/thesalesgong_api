const express = require("express");
const cron = require("node-cron");
const https = require("https");
const app = express();
const bodyParser = require("body-parser"); // TODO: do I really need this?
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./the-sales-gong-firebase-adminsdk-k5avf-77b599a64b.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://brick-hold-em-default-rtdb.firebaseio.com",
});

app.get("/", async (req, res) => {
  res.send("Welcome to The Sales Gong API");
});

const accountRouter = require("./routes/account");
app.use("/account", accountRouter);

const signUpRouter = require("./routes/sign_up");
app.use("/sign_up", signUpRouter);

const gongRouter = require("./routes/gong.js");
app.use("/gong", gongRouter);

//Uncomment below for local testing
//app.listen(3000, () => console.log("Server Started"));

//Uncomment below for push
app.listen(process.env.PORT || 5000, () => console.log("Server Started"));

// Schedule a self-ping every 5 minutes
cron.schedule('*/10 * * * *', () => {
  console.log("Pinging self...");
  https.get("https://the-sales-gong-api.onrender.com", (res) => {
    console.log(`Ping response: ${res.statusCode}`);
  });
});

