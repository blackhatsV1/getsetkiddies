import express from "express";
import db from "../db/connection.js";

const router = express.Router();

router.post("/register", (req, res) => {
  const sessionParent = req.session.parent;

  if (!sessionParent) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  const {
    firstname,
    lastname,
    child_age,
    child_gender,
    parent_id,
    parent_email,
    parent_number,
    parent_home_address,
  } = req.body;

  if (!firstname || !lastname || !child_age || !child_gender) {
    return res.status(400).json({ message: "All child fields are required" });
  }

  const parent_name = `${sessionParent.firstname} ${sessionParent.lastname}`;

  const sql = `
    INSERT INTO registered_children (
      firstname,
      lastname,
      child_age,
      child_gender,
      parent_id,
      parent_name,
      parent_email,
      parent_number,
      parent_home_address,
      date_registered
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    firstname,
    lastname,
    child_age,
    child_gender,
    parent_id || sessionParent.id,
    parent_name,
    parent_email || sessionParent.email,
    parent_number || sessionParent.phone_number,
    parent_home_address || sessionParent.home_address,
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Error registering child:", err);
      return res.status(500).json({ error: "Database error" });
    }

    console.log(
      `Child "${firstname} ${lastname}" registered by parent "${parent_name}"`
    );
    res.json({ message: "Child registered successfully" });
  });
});

export default router;
