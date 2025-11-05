import express from "express";
import db from "../db/connection.js";

const router = express.Router();

// Save safezone settings
router.post("/save", (req, res) => {
  const { childId, latitude, longitude, radius } = req.body;

  if (!childId || !latitude || !longitude || !radius) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Parse and validate numeric values
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const rad = parseInt(radius, 10);

  if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
    return res.status(400).json({ error: "Invalid numeric values for latitude, longitude, or radius" });
  }

  const sql = `
    UPDATE registered_children
    SET geofence_lat = ?, geofence_lng = ?, geofence_radius = ?
    WHERE id = ?
  `;

  db.query(sql, [lat, lng, rad, childId], (err, result) => {
    if (err) {
      console.error("Error saving safezone:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Child not found" });
    }

    res.json({ message: "Safezone settings saved successfully" });
  });
});

export default router;
