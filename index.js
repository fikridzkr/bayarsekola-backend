const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const { promisify } = require("util");
const { userInfo } = require("os");
const pipeline = promisify(require("stream").pipeline);
// init
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "PUT", "POST"],
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
      expires: 3600000,
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
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const level = req.body.level;
  const is_active = req.body.is_active;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
    db.query(
      "INSERT INTO users (username,email,password,level,is_active) VALUES (?,?,?,?,?)",
      [username, email, hash, level, is_active],
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

// login get
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

// kelas
app.get("/kelas", (req, res) => {
  db.query("SELECT * FROM kelas", (err, response) => {
    if (err) {
      console.log(err);
    }
    res.send({ kelas: response });
    console.log(response);
  });
});

app.post(
  "/datastudent",
  upload.single("foto"),
  async function (req, res, next) {
    console.log(req.body);
    const {
      file,
      body: { name },
    } = req;
    if (!req.file) {
      console.log("foto tidak ada");
    }
    if (file.detectedFileExtension != ".jpg")
      next(new Error("Invalid File Type"));
    const is_active = req.body.is_active;
    const user_id = req.body.user_id;
    const fotoName =
      Math.floor(Math.random() * 100000).toString() +
      file.detectedFileExtension;
    const nis = req.body.nis;
    const nama = req.body.nama;
    const kelas = req.body.kelas;
    const jurusan = req.body.jurusan;
    const jenis_kelamin = req.body.jenis_kelamin;
    const jumlah = req.body.jumlah;
    await pipeline(
      file.stream,
      fs.createWriteStream(`../client/public/cache/${fotoName}`)
    );
    res.send("File uploaded as " + fotoName);

    // insert data siswa
    db.query(
      "INSERT INTO siswa (user_id,foto,nis,nama,id_kelas,jurusan,jenis_kelamin) VALUES (?,?,?,?,?,?,?)",
      [user_id, fotoName, nis, nama, kelas, jurusan, jenis_kelamin],
      function (err, res) {
        if (err) {
          console.log(err);
        } else {
          console.log("data insert: ", res);
        }
      }
    );

    for (let i = 1; i <= 12; i++) {
      db.query(
        "INSERT INTO spp_siswa (user_id,bulan_id,jumlah) VALUES (?,?,?)",
        [user_id, i, jumlah],
        function (err, res) {
          if (err) {
            console.log(err);
          } else {
            console.log("datainsert : ", res);
          }
        }
      );
    }
    // update active user
    db.query(
      `UPDATE users SET is_Active = '${is_active}' WHERE id = '${user_id}'`,
      function (err, res) {
        if (err) {
          console.log(err);
        } else {
          console.log("data update: ", res);
        }
      }
    );
  }
);

app.post("/student", (req, res) => {
  const dataUser = req.body.user_id;
  db.query(
    `SELECT * FROM siswa INNER JOIN kelas ON siswa.id_kelas = kelas.id WHERE user_id = '${dataUser}'`,
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        res.send({ dataUser: result });
      }
    }
  );
});

app.put(
  "/student/update",
  upload.single("foto"),
  async function (req, res, next) {
    console.log(req.body);
    const {
      file,
      body: { name },
    } = req;
    // if (file.detectedFileExtension != ".jpg")
    //   next(new Error("Invalid File Type"));
    const user_id = req.body.user_id;
    const fotoName =
      Math.floor(Math.random() * 100000).toString() +
      file.detectedFileExtension;
    const nis = req.body.nis;
    const nama = req.body.nama;
    const kelas = req.body.kelas;
    const jurusan = req.body.jurusan;
    const jenis_kelamin = req.body.jenis_kelamin;
    await pipeline(
      file.stream,
      fs.createWriteStream(`../client/public/cache/${fotoName}`)
    );
    res.send("File uploaded as " + fotoName);

    // update data student
    db.query(
      `UPDATE siswa SET foto = '${fotoName}', nis = '${nis}', nama = '${nama}', id_kelas = '${kelas}', jurusan = '${jurusan}', jenis_kelamin = '${jenis_kelamin}' WHERE user_id = ${user_id} `,
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log(result);
        }
      }
    );
  }
);

// get activeuser
app.post("/studentstatus", (req, res) => {
  const username = req.body.user;
  console.log(req.body.user);
  db.query(
    `SELECT is_active FROM users WHERE username = '${username}'`,
    (err, response) => {
      if (err) {
        console.log(err);
      }
      console.log(response);
      res.send({ response });
    }
  );
});

// get tabel spp_siswa
app.post("/bills/user", (req, res) => {
  const dataUser = req.body.user_id;
  console.log(req.body);
  db.query(
    `SELECT * FROM spp_siswa INNER JOIN bulan ON spp_siswa.bulan_id = bulan.id WHERE user_id = '${dataUser}' LIMIT 12`,
    (err, response) => {
      if (err) {
        console.log(err);
      }
      console.log(response);
      res.send({ sppSiswa: response });
    }
  );
});

// admin
// get data siswa
app.get("/admin/student", (req, res) => {
  db.query(
    "SELECT * FROM siswa INNER JOIN kelas ON siswa.id_kelas = kelas.id",
    (err, response) => {
      if (err) {
        console.log(err);
      }
      res.send({ siswa: response });
      console.log(response);
    }
  );
});
// get data admin
app.get("/admin/admindata", (req, res) => {
  db.query("SELECT * FROM users WHERE level = 'admin' ", (err, response) => {
    if (err) {
      console.log(err);
    }
    res.send({ admin: response });
    console.log(response);
  });
});

// get data operator
// app.get("/admin/dataoperators", (req, res) => {
//   db.query(
//     "SELECT * FROM users WHERE level = 'operators' ",
//     (err, response) => {
//       if (err) {
//         console.log(err);
//       }
//       res.send({ operators: response });
//       console.log(response);
//     }
//   );
// });

// Get bulan
app.get("/bulan", (req, res) => {
  db.query("SELECT * FROM bulan", (err, response) => {
    if (err) {
      console.log(err);
    }
    res.send({ bulan: response });
    console.log(response);
  });
});

// server
app.listen(3001),
  () => {
    console.log("running server");
  };
