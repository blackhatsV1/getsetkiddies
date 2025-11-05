// api/children.js
import express from "express";
import db from "../db/connection.js";

const router = express.Router();

/* -----------------------------
   API: Register new child
----------------------------- */
router.post("/register", (req, res) => {
  const parent = req.session.parent;

  if (!parent) return res.status(401).json({ message: "Login required" });

  const { firstname, lastname, child_age, child_gender } = req.body;

  if (!firstname || !lastname || !child_age || !child_gender) {
    return res.status(400).json({ message: "All child fields required" });
  }

  const sql = `
    INSERT INTO registered_children (
      firstname, lastname, child_age, child_gender,
      parent_id, parent_name, parent_email, parent_number, parent_home_address, date_registered
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const parent_name = `${parent.firstname} ${parent.lastname}`;
  const values = [
    firstname,
    lastname,
    child_age,
    child_gender,
    parent.id,
    parent_name,
    parent.email,
    parent.phone_number,
    parent.home_address,
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Error registering child:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Child registered successfully" });
  });
});

export default router;
