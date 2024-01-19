const express = require("express");
const app = express();
const bodyParser = require("body-parser"); // TODO: do I really need this?
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", async (req, res) => {
  res.send("Welcome to The Sales Gong API");
});

const accountRouter = require("./routes/account");
app.use("/account", accountRouter);

const signUpRouter = require("./routes/sign_up");
app.use("/sign_up", signUpRouter);

//Uncomment below for local testing
app.listen(3000, () => console.log("Server Started"));

//Uncomment below for push
//app.listen(process.env.PORT || 5000, () => console.log("Server Started"));