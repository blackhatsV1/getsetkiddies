import express from "express";
import db from "../db/connection.js";
import bodyParser from "body-parser";

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

router.get("/current", (req, res) => {
  if (req.session.parent) {
    res.json({ parent: req.session.parent });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});


router.post("/register", (req, res) => {
  const { firstname, lastname, email, number, home_address, password } = req.body;

  const sql = `
    INSERT INTO parents (firstname, lastname, email, phone_number, home_address, password, date_created)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  db.query(sql, [firstname, lastname, email, number, home_address, password], (err) => {
    if (err) return res.status(500).send("Error registering parent: " + err.message);
    res.redirect("/login");
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM parents WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error("Error logging in parent:", err);
      return res.status(500).send("Database error");
    }

    if (result.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    req.session.parent = result[0];

    res.redirect("/dashboard");
  });
});

// Logout Parent
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }

    // Clear cookie if set
    res.clearCookie("connect.sid");
    res.redirect("/login"); 
  });
});


export default router;
