import express from "express";
import db from "../db/connection.js";
import bodyParser from "body-parser";

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

/* -----------------------------
   API: Register new parent
----------------------------- */
router.post("/register", (req, res) => {
  const { firstname, lastname, email, number, home_address, password } = req.body;

  if (!firstname || !lastname || !email || !password) {
    return res.status(400).send("All fields are required");
  }

  const sql = `
    INSERT INTO parents (firstname, lastname, email, phone_number, home_address, password, date_created)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  db.query(sql, [firstname, lastname, email, number, home_address, password], (err) => {
    if (err) {
      console.error("Error registering parent:", err);
      return res.status(500).send("Database error");
    }
    res.redirect("/login");
  });
});

/* -----------------------------
   API: Parent login
----------------------------- */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM parents WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("Error logging in:", err);
      return res.status(500).send("Database error");
    }

    if (result.length === 0) return res.status(401).send("Invalid credentials");

    req.session.parent = result[0];
    res.redirect("/geofence-view");
  });
});

/* -----------------------------
   API: Logout parent
----------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Error logging out");
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

/* -----------------------------
   PAGE: Track Child
----------------------------- */
router.get("/", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.redirect("/login");

  const sql = `SELECT id, firstname, lastname, child_age, child_gender, date_registered
               FROM registered_children
               WHERE parent_id = ?
               ORDER BY date_registered DESC`; // latest first

  db.query(sql, [parent.id], (err, results) => {
    if (err) {
      console.error("Error fetching children:", err);
      return res.status(500).send("Database error");
    }

    res.render("pages/track-child", {
      title: "Track Your Child",
      parent,
      children: results,
    });
  });
});

/* -----------------------------------------
   PAGE: Manage Children
----------------------------------------- */
router.get("/manage-children", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.redirect("/login");

  res.render("pages/manage-children", {
    title: "Manage Children",
    parent
  });
});

export default router;
