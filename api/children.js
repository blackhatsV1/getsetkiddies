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

// -----------------------------
// API: Delete child and related records
// -----------------------------
router.post("/delete", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.status(401).json({ message: "Login required" });

  const { child_id } = req.body;
  if (!child_id) return res.status(400).json({ message: "child_id required" });

  // verify ownership
  const checkSql = "SELECT id FROM registered_children WHERE id = ? AND parent_id = ?";
  db.query(checkSql, [child_id, parent.id], (err, results) => {
    if (err) {
      console.error("Error checking child ownership:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Child not found or not permitted" });
    }

    // delete locations, geofences, then child
    const deleteLocations = "DELETE FROM locations WHERE child_id = ?";
    db.query(deleteLocations, [child_id], (err2) => {
      if (err2) {
        console.error("Error deleting locations:", err2);
        return res.status(500).json({ error: "Failed to delete locations" });
      }

      const deleteGeofences = "DELETE FROM geofences WHERE child_id = ?";
      db.query(deleteGeofences, [child_id], (err3) => {
        if (err3) {
          console.error("Error deleting geofences:", err3);
          return res.status(500).json({ error: "Failed to delete geofences" });
        }

        const deleteChild = "DELETE FROM registered_children WHERE id = ?";
        db.query(deleteChild, [child_id], (err4) => {
          if (err4) {
            console.error("Error deleting child:", err4);
            return res.status(500).json({ error: "Failed to delete child" });
          }
          return res.json({ message: "Child and related records deleted" });
        });
      });
    });
  });
});

export default router;
