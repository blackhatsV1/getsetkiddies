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

// Update parent description
router.post("/update-description", (req, res) => {
  if (!req.session.parent) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { description } = req.body;
  const parentId = req.session.parent.id;

  const sql = "UPDATE parents SET description = ? WHERE id = ?";
  db.query(sql, [description, parentId], (err, result) => {
    if (err) {
      console.error("Error updating description:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows > 0) {
      // Update session data
      req.session.parent.description = description;
      res.json({ success: true, message: "Description updated successfully" });
    } else {
      res.status(404).json({ success: false, message: "Parent not found" });
    }
  });
});

export default router;
