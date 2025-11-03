import express from "express";
import db from "../db/connection.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { child_id, latitude, longitude, readable_address } = req.body;
  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

  const sql = `
    INSERT INTO locations (child_id, latitude, longitude, readable_address, timestamp)
    VALUES (?, ?, ?, ?, NOW())
  `;
  db.query(sql, [child_id, latitude, longitude, readable_address], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Location saved successfully" });
  });
});

export default router;
