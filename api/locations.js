import express from "express";
import db from "../db/connection.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { child_id, latitude, longitude, readable_address } = req.body;
  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

  const sql = `
    INSERT INTO locations (child_id, latitude, longitude, readable_address, date_time)
    VALUES (?, ?, ?, ?, NOW())
  `;
  db.query(sql, [child_id, latitude, longitude, readable_address], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Location saved successfully" });
  });
});

// Get last location for a child
router.get("/child/:child_id", (req, res) => {
  const { child_id } = req.params;
  if (!child_id) return res.status(400).json({ message: "Child ID is required" });

  const sql = `
    SELECT latitude, longitude, readable_address, date_time
    FROM locations
    WHERE child_id = ?
    ORDER BY date_time DESC
    LIMIT 1
  `;
  db.query(sql, [child_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "No location found for this child" });
    res.json(results[0]);
  });
});

export default router;
