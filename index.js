const express = require("express");
const path = require("path");
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
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  res.render("index");
});

const accountRouter = require("./routes/account");
app.use("/account", accountRouter);

const signUpRouter = require("./routes/sign_up");
app.use("/sign_up", signUpRouter);

const gongRouter = require("./routes/gong.js");
app.use("/gong", gongRouter);

const supportRouter = require("./routes/support");
app.use("/support", supportRouter);

//Uncomment below for local testing
app.listen(3000, () => console.log("Server Started"));

//Uncomment below for push
//app.listen(process.env.PORT || 5000, () => console.log("Server Started"));

// Schedule a self-ping every 10 minutes
// Uncomment for production push. Comment for local testing
// cron.schedule('*/10 * * * *', () => {
//   console.log("Pinging self...");
//   https.get("https://the-sales-gong-api.onrender.com", (res) => {
//     console.log(`Ping response: ${res.statusCode}`);
//   });
// });

