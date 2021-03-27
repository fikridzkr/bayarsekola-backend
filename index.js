const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();

// init
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "",
  database: "bayarsekola",
});

app.post("/register", (req, res) => {
  const fullName = req.body.fullName;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const level = req.body.level;
  db.query(
    "INSERT INTO users (fullname,username,email,password,level) VALUES (?,?,?,?,?)",
    [fullName, username, email, password, level],
    function (err, res) {
      if (err) {
        console.log(err);
      } else {
        console.log("data insert", res);
      }
    }
  );
});

app.listen(3001),
  () => {
    console.log("server running");
  };
