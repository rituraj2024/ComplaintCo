import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import ejs from "ejs";
import mysql from "mysql";
import path from "path";

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "complaintco",
});

pool.getConnection(function (err) {
  if (err) throw err;
  else console.log("Successfully connected to database");
});

app.listen(4899, () => {
  console.log("Server running on port 4899");
});

let loggedInUsername = null;
let loggedInDusername = null;

function logout() {
  loggedInUsername = null;
}

function logout2() {
  loggedInDusername = null;
}

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/signin", (req, res) => {
  const susername = req.body.username;
  const spassword = req.body.password;

  const dusername = req.body.dusername;
  const dpassword = req.body.dpassword;

  if (susername && spassword) {
    pool.query(
      "SELECT * FROM reg_students WHERE userid=? and password=?",
      [susername, spassword],
      (err, results, fields) => {
        console.log(results);
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        if (results.length > 0) {
          if (results[0].password === spassword) {
            loggedInUsername = susername;
            res.redirect("/home");
            // res.render("home",{username : results[0].username, password : results[0].password });
            // res.redirect("home", {username : results[0].username, password : results[0].password });
          }
        } else {
          // alert("Incorrect credentials, please try again.");
          // res.redirect("/");
          return res.json({
            message: "Incorrect credentials, please try again.",
          });
        }
        res.end();
      }
    );
  } else if (dusername && dpassword) {
    pool.query(
      "SELECT * FROM departments WHERE dusername=? and dpassword=?",
      [dusername, dpassword],
      (err, results1, fields) => {
        console.log(results1);
        if (err) {
          console.log(err);
        }
        if (results1.length > 0) {
          if (results1[0].dpassword === dpassword) {
            loggedInDusername = dusername;
            console.log(loggedInDusername);
            res.redirect("/dhome");
            res.render("dhome", {
              dusername: results1[0].dusername,
              dpassword: results1[0].dpassword,
            });
          }
        } else {
          console.log("Incorrect credentials, please try again");
          // res.render("signin");
        }
        res.end();
      }
    );
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const passwordConfirmation = req.body.passwordConfirmation;

  if (username && password && passwordConfirmation) {
    pool.query(
      "SELECT * FROM reg_students where userid=?",
      [username],
      (err, results, fields) => {
        if (results.length === 0) {
          // unregistered student
          pool.query(
            "SELECT * FROM nitap_students where userid=?",
            [username],
            (err, results1) => {
              if (results1.length > 0) {
                if (password !== passwordConfirmation) {
                  console.log("Passwords donot match");
                  res.render("signup");
                } else {
                  pool.query(
                    "INSERT INTO reg_students(userid, password) values (?, ?)",
                    [username, password],
                    (err, results2) => {
                      if (results2.length > 0) {
                        console.log(results2[0].username, results2[0].password);
                        res.render("signin", {
                          username: results2[0].username,
                          password: results2[0].password,
                        });
                      }
                      res.redirect("/");
                    }
                  );
                }
              } else {
                console.log("You are not eligible");
              }
            }
          );
        } else {
          res.send("Account already exists");
        }
      }
    );
  } else {
    alert("Fill the fields");
  }
});

app.get("/home", function (req, res) {
  res.render("home");
});

app.post("/home", function (req, res) {
  res.redirect("/dept");
});

app.get("/dept", function (req, res) {
  res.render("dept");
});

let deptid = 0;
app.post("/dept", (req, res) => {
  const dname = req.body.buttonValue;
  console.log("dept: ", req.body.buttonValue);

  pool.query(
    "select * from departments where dname = ?",
    [dname],
    (err, results, fields) => {
      if (results.length > 0) {
        console.log(results);
        deptid = results[0].deptid;
        console.log("deptid: ", deptid);
        console.log(loggedInUsername);
        res.render("register", { deptid: results[0].deptid });
      }
    }
  );
  res.redirect("/register");
  res.end();
});

app.get("/register", function (req, res) {
  res.render("register");
});

let compid;
app.post("/register", (req, res) => {
  console.log("deptid in register: ", deptid);
  console.log("user in register: ", loggedInUsername);
  const today = new Date();
  console.log("today's date: ", today);
  let upvotes = 0;
  const content = req.body.content;
  console.log(content);
  pool.query(
    "insert into complaints(userid, deptid, date, description, upvotes, status, remarks) values(?, ?, ?, ?, ?, ?, ?)",
    [loggedInUsername, deptid, today, content, upvotes, "Sent", "-"],
    (err, results, fields) => {
      if (!err) {
        if (results) {
          console.log(results);
          pool.query(
            "select max(cid) from complaints",
            (err, results2, fields) => {
              if (results2.length > 0) {
                console.log(results2);
                compid = results2[0]["max(cid)"];
                console.log(compid);
                console.log(deptid);
                pool.query(
                  "insert into complaint_dept(cid, deptid) values(?, ?)",
                  [compid, deptid],
                  (err, results1, fields) => {
                    if (!err) {
                      if (results1.length === 0) {
                        console.log(results1);
                        res.render("completed", {
                          results1: results1,
                          results: results,
                        });
                      }
                    }
                  }
                );
                pool.query(
                  "insert into registers(cid, userid) values(?, ?)",
                  [compid, loggedInUsername],
                  (err, results2, fields) => {
                    if (!err) {
                      if (results2.length === 0) {
                        console.log(results2);
                        res.render("completed", {
                          results2: results2,
                          results: results,
                        });
                      }
                    }
                  }
                );
              } else {
                console.log(err);
              }
            }
          );
        }
      }
    }
  );
  res.redirect("/completed");
});

app.get("/completed", (req, res) => {
  res.render("completed");
});

app.post("/completed", (req, res) => {
  res.redirect("/home");
});

let complaints = [];

app.get("/complaints", function (req, res, next) {
  console.log(loggedInUsername);
  console.log("1");
  pool.query(
    "SELECT cid, userid, dname, date, description, upvotes, status FROM complaints c join departments d on c.deptid = d.deptid where status = ? order by date desc",
    ["Accepted"],
    (err, results, fields) => {
      // console.log("hello");
      if (err) {
        return next(err);
      }
      console.log(results);
      if (results && results.length > 0) {
        for (var i = 0; i < results.length; i++) {
          complaints.push(results[i]);
          console.log(complaints[i]);
          let year = results[i].date.getFullYear().toString();
          let month = (results[i].date.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          let day = results[i].date.getDate().toString().padStart(2, "0");
          results[i].date = day + "-" + month + "-" + year;
        }
        const fetchUpvotesPromises = complaints.map((complaint) => {
          return new Promise((resolve, reject) => {
            pool.query(
              "SELECT * FROM upvotes WHERE userid = ? AND cid = ?",
              [loggedInUsername, complaint.cid],
              (err, results1, fields) => {
                if (err) {
                  return reject(err);
                }
                complaint.upvoted = results1.length > 0;
                resolve();
              }
            );
          });
        });

        Promise.all(fetchUpvotesPromises)
          .then(() => {
            res.render("complaints", {
              complaints: complaints,
              user: loggedInUsername,
            });
          })
          .catch(next);
      } else {
        res.send("<h1>No complaints accepted yet</h1>");
      }
    }
  );
  // console.log(user);

  // for(var i = 0; i < complaints.length; i++){
  //     res.render("complaints", {complaints:complaints, user: loggedInUsername});
  // }
  complaints = [];
});

app.post("/complaints/upvote", function (req, res, next) {
  const { cid, userid } = req.body;
  pool.query(
    "SELECT * FROM upvotes WHERE cid = ? AND userid = ?",
    [cid, userid],
    (err, results) => {
      if (err) return next(err);
      if (results.length > 0) {
        return res.json({ message: "Already upvoted" });
      }
      pool.query(
        "UPDATE complaints SET upvotes = upvotes + 1 WHERE cid = ?",
        [cid],
        (err, results) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          pool.query(
            "INSERT INTO upvotes (userid, cid) VALUES (?, ?)",
            [userid, cid],
            (err, results) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Database error", error: err });
              res.json({ message: "Upvoted successfully" });
            }
          );
        }
      );
    }
  );
});

app.post("/complaints/downvote", function (req, res, next) {
  const { cid, userid } = req.body;
  pool.query(
    "SELECT * FROM upvotes WHERE cid = ? AND userid = ?",
    [cid, userid],
    (err, results) => {
      if (err)
        return res.status(500).json({ message: "Database error", error: err });
      if (results.length === 0) {
        return res.json({ message: "Not upvoted yet" });
      }
      pool.query(
        "UPDATE complaints SET upvotes = upvotes - 1 WHERE cid = ?",
        [cid],
        (err, results) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          pool.query(
            "DELETE FROM upvotes WHERE userid = ? AND cid = ?",
            [userid, cid],
            (err, results) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Database error", error: err });
              res.json({ message: "Downvoted successfully" });
            }
          );
        }
      );
    }
  );
});

let mycomplaints = [];
app.get("/mycomplaints", function (req, res) {
  console.log(loggedInUsername);
  pool.query(
    "SELECT cid, deptid, date, description, upvotes, status, remarks FROM complaints WHERE userid = ? order by date desc",
    [loggedInUsername],
    (err, results, fields) => {
      console.log(results);
      if (results && results.length > 0) {
        // console.log(results);
        for (var i = 0; i < results.length; i++) {
          mycomplaints.push(results[i]);
          console.log(mycomplaints[i]);
          let year = results[i].date.getFullYear().toString();
          let month = (results[i].date.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          let day = results[i].date.getDate().toString().padStart(2, "0");
          results[i].date = day + "-" + month + "-" + year;
        }
      } else {
        res.send("<h1><en>No complaints registered....<en><h1>");
      }
      for (var i = 0; i < mycomplaints.length; i++) {
        res.render("mycomplaints", { mycomplaints: mycomplaints });
        mycomplaints = [];
      }
    }
  );
});

app.post("/mycomplaints", function (req, res, next) {
  if (err) {
    res.redirect("/complaints");
  }
  res.redirect("/complaints");
  // req.next();
});

app.post("/mycomplaints/withdraw", (req, res) => {
  const { cid } = req.body;
  console.log("Inside withdraw");
  // delete from complaints table
  pool.query(
    "delete from complaint_dept where cid = ?",
    [cid],
    (err, results, fields) => {
      if (err) {
        console.error("Error deleting entry from complaint_dept table: ", err);
        return res.status(500).send("Error withdrawing complaint");
      }

      // delete from complaint_dept table
      pool.query(
        "delete from registers where cid=?",
        [cid],
        (err, results, fields) => {
          if (err) {
            console.error("Error deleting entry from registers table: ", err);
            return res.status(500).send("Error withdrawing complaint");
          }

          // delete from registers table
          pool.query(
            "delete from complaints where cid=?",
            [cid],
            (err, results, fields) => {
              if (err) {
                console.error("Error deleting entry from complaint:", err);
                return res.status(500).send("Error withdrawing complaint");
              }
              console.log("Complaint withdrawn");
              return res.status(200).send("Complaint withdrawn successfully");
            }
          );
        }
      );
    }
  );
});

app.get("/dhome", function (req, res) {
  console.log(loggedInDusername);
  pool.query(
    "SELECT cid FROM complaints c join departments d on c.deptid = d.deptid WHERE dusername = ?",
    [loggedInDusername],
    (err, results, fields) => {
      let noofcomplaints;
      if (results && results.length > 0) {
        console.log(results.length);
        noofcomplaints = results.length;
        console.log(noofcomplaints);
        res.render("dhome", { noofcomplaints: noofcomplaints });
      } else if (results.length === 0) {
        res.render("dhome", { noofcomplaints: 0 });
      }
    }
  );
});

let dcomplaints = [];
app.get("/dcomplaints", (req, res) => {
  pool.query(
    "SELECT * FROM departments WHERE dusername = ?",
    [loggedInDusername],
    (err, results1, fields) => {
      if (results1 && results1.length > 0) {
        console.log(results1);
        let deptid = results1[0].deptid;
        console.log(deptid);
        console.log("Inside dcomplaints");
        pool.query(
          "SELECT cid, userid, date, description, upvotes, status, remarks FROM complaints c join departments d on c.deptid = d.deptid WHERE d.deptid = ? order by upvotes desc",
          [deptid],
          (err, results, fields) => {
            console.log(results);
            console.log("Inside query");
            if (results.length > 0) {
              // console.log("Inside if");
              for (var i = 0; i < results.length; i++) {
                dcomplaints.push(results[i]);
                let year = results[i].date.getFullYear().toString();
                let month = (results[i].date.getMonth() + 1)
                  .toString()
                  .padStart(2, "0");
                let day = results[i].date.getDate().toString().padStart(2, "0");
                results[i].date = day + "-" + month + "-" + year;
                console.log(results[i].date);
                console.log(dcomplaints[i]);
              }
              for (var i = 0; i < dcomplaints.length; i++) {
                res.render("dcomplaints", {
                  dcomplaints: dcomplaints,
                  action: "view",
                  title: "Complaints",
                });
                dcomplaints = [];
              }
            }
          }
        );
      }
    }
  );
});

let dashboard = [];
let yettobechecked;
let accept;
let progress;
let total;
app.get("/dashboard", function (req, res) {
  console.log("dusername: ", loggedInDusername);
  pool.query(
    "SELECT * FROM departments where dusername = ?",
    [loggedInDusername],
    (err, results1, fields) => {
      console.log("printing results: ", results1);
      if (results1 && results1.length > 0) {
        console.log("results > 0");
        console.log(results1);
        let deptid = results1[0].deptid;
        console.log(deptid);
        pool.query(
          'SELECT cid, userid, date, description, upvotes, status, remarks FROM complaints c join departments d on c.deptid = d.deptid WHERE d.deptid = ? and status = "In Progress" order by upvotes desc',
          [deptid],
          (err, results, fields) => {
            if (results && results.length > 0) {
              for (var i = 0; i < results.length; i++) {
                dashboard.push(results[i]);
                let year = results[i].date.getFullYear().toString();
                let month = (results[i].date.getMonth() + 1)
                  .toString()
                  .padStart(2, "0");
                let day = results[i].date.getDate().toString().padStart(2, "0");
                results[i].date = day + "-" + month + "-" + year;
                console.log(results[i].date);
                console.log(dashboard[i]);
              }

              pool.query(
                "SELECT cid FROM complaints c join departments d on c.deptid = d.deptid WHERE dusername = ?",
                [loggedInDusername],
                (err, results4, fields) => {
                  // console.log(results4.length);
                  if (results && results4) {
                    console.log(results4.length);
                    total = results4.length;
                    console.log(total);
                    // res.render("dashboard", {accept : accept});
                  } else {
                    total = 0;
                  }
                }
              );

              pool.query(
                'SELECT cid FROM complaints c join departments d on c.deptid = d.deptid WHERE dusername = ? and status = "Accepted"',
                [loggedInDusername],
                (err, results1, fields) => {
                  // console.log(results1.length);
                  if (results && results1) {
                    console.log(results1.length);
                    accept = results1.length;
                    console.log(accept);
                    // res.render("dashboard", {accept : accept});
                  } else {
                    accept = 0;
                  }
                }
              );

              pool.query(
                'SELECT cid FROM complaints c join departments d on c.deptid = d.deptid WHERE dusername = ? and status = "Sent"',
                [loggedInDusername],
                (err, results2, fields) => {
                  // console.log(results2.length);
                  if (results && results2) {
                    console.log(results2.length);
                    yettobechecked = results2.length;
                    console.log(yettobechecked);
                    // res.render("dashboard", {yettobechecked : yettobechecked});
                  } else {
                    yettobechecked = 0;
                  }
                  // else{
                  //     console.log(err);
                  // }
                }
              );
              pool.query(
                'SELECT cid FROM complaints c join dadmin d on c.deptid = d.deptid WHERE dusername = ? and status = "In Progress"',
                [loggedInDusername],
                (err, results3, fields) => {
                  // console.log(results3.length);
                  if (results && results3) {
                    console.log(results3.length);
                    progress = results3.length;
                    console.log(progress);
                    // res.render("dashboard", {progress : progress});
                  } else {
                    progress = 0;
                  }
                  // else{
                  //     console.log(err);
                  // }
                }
              );
            }
            // else{
            //     console.log(err);
            // }
          }
        );
      }
      // else{
      //     console.log(err);
      // }
    }
  );
  res.render("dashboard", {
    total: total,
    accept: accept,
    yettobechecked: yettobechecked,
    progress: progress,
    dashboard: dashboard,
  });
  dashboard = [];
});

app.post("/dashboard", function (req, res) {
  res.redirect("/dcomplaints");
});

app.get("/dcomplaints/edit/:cid", function (req, res, next) {
  var cid = req.params.cid;
  pool.query(
    `SELECT * FROM complaints WHERE cid = ?`,
    [cid],
    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      console.log("results length");
      console.log(results.length);
      console.log("Results");
      console.log(results[0]);
      res.render("dcomplaints", {
        title: "Edit Complaint",
        action: "edit",
        dcomplaints: results[0],
        cid: cid,
      });
    }
  );
});

app.post("/dcomplaints/edit/:cid", function (req, res, next) {
  var cid = req.params.cid;
  var status = req.body.status;
  var remarks = req.body.remarks;
  pool.query(
    `UPDATE complaints SET status = "${status}", remarks = "${remarks}" WHERE cid = "${cid}"`,
    (err, results) => {
      if (err) {
        throw err;
      } else {
        res.redirect("/dcomplaints");
      }
    }
  );
});
