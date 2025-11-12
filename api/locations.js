import express from "express";
import db from "../db/connection.js";

const router = express.Router();

/* -----------------------------
   API: Get last known location
----------------------------- */
router.get("/:child_id", async (req, res) => {
  const { child_id } = req.params;
  const sql = `
    SELECT * FROM locations
    WHERE child_id = ?
    ORDER BY date_time DESC
    LIMIT 1
  `;
  try {
    const [results] = await db.query(sql, [child_id]);
    if (results.length === 0) return res.json({ message: "no records yet" });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   API: Save or update location
----------------------------- */
router.post("/", async (req, res) => {
  const { child_id, latitude, longitude, readable_address } = req.body;
  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

  const checkSql = `
    SELECT id, readable_address FROM locations
    WHERE child_id = ?
    ORDER BY date_time DESC
    LIMIT 1
  `;

  try {
    const [results] = await db.query(checkSql, [child_id]);
    if (results.length > 0 && results[0].readable_address === readable_address) {
      const updateSql = `
        UPDATE locations SET date_time = NOW(), latitude = ?, longitude = ?
        WHERE id = ?
      `;
      await db.query(updateSql, [latitude, longitude, results[0].id]);
      res.json({ message: "Updated existing record timestamp" });
    } else {
      const insertSql = `
        INSERT INTO locations (child_id, latitude, longitude, readable_address, date_time)
        VALUES (?, ?, ?, ?, NOW())
      `;
      await db.query(insertSql, [child_id, latitude, longitude, readable_address]);
      res.json({ message: "New location saved" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   API: Get location history
----------------------------- */
router.get("/history/:child_id", async (req, res) => {
  const { child_id } = req.params;
  const sql = `
    SELECT latitude, longitude, readable_address, date_time
    FROM locations
    WHERE child_id = ?
    ORDER BY date_time ASC
  `;
  try {
    const [results] = await db.query(sql, [child_id]);
    if (results.length === 0) return res.json({ message: "no records yet" });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
