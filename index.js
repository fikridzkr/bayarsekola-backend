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
const moment = require("moment");
// init
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
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

app.post("/datastudent", (req, res) => {
  const is_active = req.body.is_active;
  const user_id = req.body.user_id;
  const nis = req.body.nis;
  const nama = req.body.nama;
  const kelas = req.body.kelas;
  const jurusan = req.body.jurusan;
  const jenis_kelamin = req.body.jenis_kelamin;
  const jumlah = req.body.jumlah;
  // insert data siswa
  db.query(
    "INSERT INTO siswa (user_id,nis,nama,id_kelas,jurusan,jenis_kelamin) VALUES (?,?,?,?,?,?)",
    [user_id, nis, nama, kelas, jurusan, jenis_kelamin],
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
});

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

app.put("/student/update", (req, res) => {
  const user_id = req.body.user_id;
  const nis = req.body.nis;
  const nama = req.body.nama;
  const kelas = req.body.kelas;
  const jurusan = req.body.jurusan;
  const jenis_kelamin = req.body.jenis_kelamin;

  // update data student
  db.query(
    `UPDATE siswa SET nis = '${nis}', nama = '${nama}', id_kelas = '${kelas}', jurusan = '${jurusan}', jenis_kelamin = '${jenis_kelamin}' WHERE user_id = ${user_id} `,
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
      }
    }
  );
});

// get activeuser
app.post("/studentstatus", (req, res) => {
  const username = req.body.user;
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

// changepassword
app.put("/changepassword", (req, res) => {
  const newPassword = req.body.newPassword;
  const userId = req.body.user_id;
  bcrypt.hash(newPassword, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
    db.query(
      `UPDATE users SET password = '${hash}' WHERE id = '${userId}'`,
      function (err, res) {
        if (err) {
          console.log(err);
        } else {
          console.log("password update", res);
        }
      }
    );
  });
});

// sppsiswa
app.put("/sppsiswa", upload.single("bukti"), async function (req, res, next) {
  const {
    file,
    body: { name },
  } = req;

  if (file.detectedFileExtension != ".jpg")
    next(new Error("Invalid File Type"));

  const fileName =
    Math.floor(Math.random() * 1000000) + file.detectedFileExtension;
  const userId = req.body.user_id;
  const bulan = req.body.bulan;

  const tanggalBayar = moment().format();
  const keterangan = "Sedang Diproses";
  await pipeline(
    file.stream,
    fs.createWriteStream(`../client/public/cache/${fileName}`)
  );
  res.send("File Uploaded as" + fileName);

  db.query(
    `UPDATE spp_siswa SET tanggal_bayar = '${tanggalBayar}',bukti_pembayaran = '${fileName}', keterangan = '${keterangan}' WHERE user_id = '${userId}' AND bulan_id = ${bulan}`,
    (err, response) => {
      if (err) {
        console.log(err);
      } else {
        console.log("data insert", response);
      }
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

// get count users
app.get("/admin/countadmin", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS AdminCount FROM `users` WHERE level = 'admin' ",
    (err, admin) => {
      if (err) {
        console.log(err);
      }
      res.send({ admin });
      console.log(admin);
    }
  );
});
app.get("/admin/countoperators", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS OperatorsCount FROM `users` WHERE level = 'operators' ",
    (err, operators) => {
      if (err) {
        console.log(err);
      }
      res.send({ operators });
      console.log(operators);
    }
  );
});
app.get("/admin/countstudents", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS StudentsCount  FROM `users` WHERE level = 'students' ",
    (err, students) => {
      if (err) {
        console.log(err);
      }
      res.send({ students });
      console.log(students);
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

// delete data admin
app.delete("/admin/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM users WHERE id = ?`, id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

// get data operator
app.get("/admin/dataoperators", (req, res) => {
  db.query(
    "SELECT * FROM users WHERE level = 'operators' ",
    (err, response) => {
      if (err) {
        console.log(err);
      }
      res.send({ operators: response });
      console.log(response);
    }
  );
});

// delete data operator
app.delete("/operators/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM users WHERE id = ?`, id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

// Get bulan
app.post("/bulan", (req, res) => {
  const userId = req.body.user_id;
  db.query(
    `SELECT bulan_id, bulan,tahun FROM spp_siswa INNER JOIN bulan ON spp_siswa.bulan_id = bulan.id WHERE user_id = '${userId}' AND keterangan = 'Belum Bayar'`,
    (err, response) => {
      if (err) {
        console.log(err);
      }
      res.send({ bulan: response });
      console.log(response);
    }
  );
});

//operators
app.get("operators/statuspayment", (req, res) => {
  db.query(
    'SELECT * FROM spp_siswa INNER JOIN users ON spp_siswa.user_id = users.id WHERE keterangan = "Sedang Diproses"'
  );
});

app.post("/searchnis/datasiswa", (req, res) => {
  const valueNis = req.body.valueNis;
  db.query(
    `SELECT * FROM siswa INNER JOIN kelas ON siswa.id_kelas = kelas.id WHERE nis = '${valueNis}'`,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send({ dataSiswa: result });
    }
  );
});

app.post("/searchnis/sppsiswa", (req, res) => {
  const userId = req.body.userId;
  db.query(
    `SELECT * FROM spp_siswa INNER JOIN bulan ON spp_siswa.bulan_id = bulan.id WHERE user_id = '${userId}'`,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send({ sppSiswa: result });
    }
  );
});

// get data siswa - operator
app.get("/operators/datasiswa", (req, res) => {
  db.query(
    "SELECT * FROM siswa INNER JOIN kelas ON siswa.id_kelas = kelas.id",
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send({ siswa: result });
    }
  );
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    if (req.body.userStatus) {
      res.send({ loggedIn: false });
    }
  });
});

// server
app.listen(3001),
  () => {
    console.log("running server");
  };
