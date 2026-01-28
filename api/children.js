import express from "express";
import db from "../db/connection.js";

const router = express.Router();

/* -----------------------------
   API: Register new child
----------------------------- */
router.post("/register", async (req, res) => {
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

  try {
    await db.query(sql, values);
    res.json({ message: "Child registered successfully" });
  } catch (err) {
    console.error("Error registering child:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* -----------------------------
   API: Delete child and related records
----------------------------- */
router.post("/delete", async (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.status(401).json({ message: "Login required" });

  const { child_id } = req.body;
  if (!child_id) return res.status(400).json({ message: "child_id required" });

  try {
    const [checkResults] = await db.query(
      "SELECT id FROM registered_children WHERE id = ? AND parent_id = ?",
      [child_id, parent.id]
    );
    if (checkResults.length === 0)
      return res.status(404).json({ message: "Child not found or not permitted" });

    await db.query("DELETE FROM locations WHERE child_id = ?", [child_id]);
    await db.query("DELETE FROM geofences WHERE child_id = ?", [child_id]);
    await db.query("DELETE FROM registered_children WHERE id = ?", [child_id]);

    res.json({ message: "Child and related records deleted" });
  } catch (err) {
    console.error("Error deleting child:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
