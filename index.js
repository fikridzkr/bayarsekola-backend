const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// init
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    key: "userId",
    secret: "bayarsekola",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: new Date(Date.now() + 30000),
      maxAge: 30000,
    },
  })
);
// db connection
const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "",
  database: "bayarsekola",
});

// create user
app.post("/register", (req, res) => {
  const fullName = req.body.fullName;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const level = req.body.level;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
    db.query(
      "INSERT INTO users (fullname,username,email,password,level) VALUES (?,?,?,?,?)",
      [fullName, username, email, hash, level],
      function (err, res) {
        if (err) {
          console.log(err);
        } else {
          console.log("data insert", res);
        }
      }
    );
  });
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    res.send({ loggedIn: true, user: req.session.user });
  } else {
    res.send({ loggedIn: false });
  }
});

// login
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.query(
    "SELECT * FROM users WHERE username = ? ;",
    username,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (error, response) => {
          if (response) {
            req.session.user = result;
            console.log(req.session.user);
            res.send(result);
          } else {
            res.send({ message: "Wrong username/password combination" });
          }
        });
      } else {
        res.send({ message: "User doesn't exist" });
      }
    }
  );
});

// server
app.listen(3001),
  () => {
    console.log("running server");
  };
