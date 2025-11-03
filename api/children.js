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

  // Capitalize first letter of first name and last name
  const capitalizedFirstname = firstname.charAt(0).toUpperCase() + firstname.slice(1).toLowerCase();
  const capitalizedLastname = lastname.charAt(0).toUpperCase() + lastname.slice(1).toLowerCase();

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
    capitalizedFirstname,
    capitalizedLastname,
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
      `Child "${capitalizedFirstname} ${capitalizedLastname}" registered by parent "${parent_name}"`
    );
    res.json({ message: "Child registered successfully" });
  });
});

// Remove a child
router.delete("/remove/:id", (req, res) => {
  const sessionParent = req.session.parent;

  if (!sessionParent) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  const childId = req.params.id;

  if (!childId) {
    return res.status(400).json({ message: "Child ID is required" });
  }

  // First, check if the child belongs to the logged-in parent
  const checkSql = "SELECT parent_id FROM registered_children WHERE id = ?";
  db.query(checkSql, [childId], (err, results) => {
    if (err) {
      console.error("Error checking child ownership:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Child not found" });
    }

    if (results[0].parent_id !== sessionParent.id) {
      return res.status(403).json({ message: "You can only remove your own children" });
    }

    // Proceed to delete the child
    const deleteSql = "DELETE FROM registered_children WHERE id = ?";
    db.query(deleteSql, [childId], (err, result) => {
      if (err) {
        console.error("Error removing child:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Child not found" });
      }

      console.log(`Child with ID ${childId} removed by parent "${sessionParent.firstname} ${sessionParent.lastname}"`);
      res.json({ message: "Child removed successfully" });
    });
  });
});

export default router;
