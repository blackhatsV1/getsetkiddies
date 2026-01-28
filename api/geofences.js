import express from "express";
import db from "../db/connection.js";

const router = express.Router();

/* -----------------------------
   PAGE: Geofence Setup
----------------------------- */
router.get("/setup", async (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parent = req.session.parent;
  const selectedChildId = req.query.child_id || null;

  const sql = `
    SELECT c.id, c.firstname, c.lastname, c.child_age, c.child_gender,
           l.latitude, l.longitude, l.date_time,
           g.id AS geofence_id, g.name AS geofence_name,
           g.created_at AS geofence_created_at, g.updated_at AS geofence_updated_at
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
    LEFT JOIN geofences AS g ON c.id = g.child_id
    WHERE c.parent_id = ?
  `;

  try {
    const [children] = await db.query(sql, [parent.id]);
    res.render("pages/geofence-setup", {
      title: "Get Set Kiddies",
      parent,
      children,
      selectedChildId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* -----------------------------
   API: Add or Replace Geofence
----------------------------- */
router.post("/add", async (req, res) => {
  const { child_id, name, latitude, longitude, radius } = req.body;

  try {
    const [results] = await db.query("SELECT id FROM geofences WHERE child_id = ?", [child_id]);
    if (results.length > 0) {
      await db.query(
        `UPDATE geofences
         SET name = ?, latitude = ?, longitude = ?, radius = ?, updated_at = NOW()
         WHERE child_id = ?`,
        [name, latitude, longitude, radius, child_id]
      );
      res.json({ message: "Existing geofence replaced successfully" });
    } else {
      await db.query(
        `INSERT INTO geofences (child_id, name, latitude, longitude, radius, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [child_id, name, latitude, longitude, radius]
      );
      res.json({ message: "Geofence added successfully" });
    }
  } catch (err) {
    console.error("Error saving geofence:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* -----------------------------
   API: Get geofences for child
----------------------------- */
router.get("/:child_id", async (req, res) => {
  const { child_id } = req.params;
  try {
    const [results] = await db.query("SELECT * FROM geofences WHERE child_id = ?", [child_id]);
    res.json(results);
  } catch (err) {
    console.error("Error fetching geofences:", err);
    res.status(500).send("Database error");
  }
});

export default router;
