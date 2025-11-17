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

/* --------- --------------------------------
   API children with last location, geofence status
----------------------------------------- */
router.get("/list/all", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.status(401).json({ message: "Login required" });

  const sql = `
    SELECT
      c.id,
      c.firstname,
      c.lastname,
      c.child_age,
      c.child_gender,
      c.date_registered,

      -- Last location
      l.latitude,
      l.longitude,
      l.readable_address,
      l.date_time AS last_seen,

      -- Geofence
      g.id AS geofence_id,
      g.latitude AS fence_lat,
      g.longitude AS fence_lng,
      g.radius
    FROM registered_children AS c
    LEFT JOIN (
      SELECT child_id, latitude, longitude, readable_address, date_time
      FROM locations
      WHERE (child_id, date_time) IN (
        SELECT child_id, MAX(date_time)
        FROM locations
        GROUP BY child_id
      )
    ) AS l ON c.id = l.child_id
    LEFT JOIN geofences AS g ON c.id = g.child_id
    WHERE c.parent_id = ?
    ORDER BY c.date_registered DESC
  `;

  db.query(sql, [parent.id], (err, results) => {
    if (err) {
      console.error("Error fetching manage children data:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Compute geofence status
    const processed = results.map(row => {
      let status = "none";

      if (row.fence_lat && row.latitude) {
        const R = 6371e3;
        const dLat = (row.latitude - row.fence_lat) * Math.PI / 180;
        const dLon = (row.longitude - row.fence_lng) * Math.PI / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(row.fence_lat * Math.PI / 180) *
          Math.cos(row.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c;

        status = distance <= row.radius ? "inside" : "outside";
      }

      return { ...row, geofence_status: status };
    });

    res.json(processed);
  });
});


export default router;
