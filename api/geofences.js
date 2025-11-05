// api/geofences.js
import express from "express";
import db from "../db/connection.js";

const router = express.Router();

/* -----------------------------
   PAGE: Geofence Setup
----------------------------- */
// api/geofences.js
router.get("/setup", (req, res) => {
  if (!req.session.parent) {
    return res.redirect("/login");
  }

  const parent = req.session.parent;

  const sql = `
    SELECT c.id, c.firstname, c.lastname, c.child_age, c.child_gender,
           l.latitude, l.longitude, l.date_time
    FROM registered_children AS c
    LEFT JOIN (
      SELECT child_id, latitude, longitude, date_time
      FROM locations
      WHERE (child_id, date_time) IN (
        SELECT child_id, MAX(date_time)
        FROM locations
        GROUP BY child_id
      )
    ) AS l ON c.id = l.child_id
    WHERE c.parent_id = ?
  `;

  db.query(sql, [parent.id], (err, children) => {
    if (err) {
      console.error("Error fetching children with last location:", err);
      return res.status(500).send("Database error");
    }

    res.render("pages/geofence-setup", {
      title: "Get Set Kiddies",
      parent,
      children,
    });
  });
});

/* -----------------------------
   API: Add geofence
----------------------------- */
router.post("/add", (req, res) => {
  const { child_id, name, latitude, longitude, radius } = req.body;

  const sql = `
    INSERT INTO geofences (child_id, name, latitude, longitude, radius)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, [child_id, name, latitude, longitude, radius], (err) => {
    if (err) {
      console.error("Error adding geofence:", err);
      return res.status(500).send("Database error");
    }
    res.json({ message: "Geofence added successfully" });
  });
});

/* -----------------------------
   API: Get geofences for child
----------------------------- */
router.get("/:child_id", (req, res) => {
  const { child_id } = req.params;
  const sql = "SELECT * FROM geofences WHERE child_id = ?";
  db.query(sql, [child_id], (err, results) => {
    if (err) {
      console.error("Error fetching geofences:", err);
      return res.status(500).send("Database error");
    }
    res.json(results);
  });
});

export default router;
