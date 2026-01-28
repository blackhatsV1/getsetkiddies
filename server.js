// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

import db from "./db/connection.js";

// Import routes
import parentRoutes from "./api/parents.js";
import childRoutes from "./api/children.js";
import locationRoutes from "./api/locations.js";
import geofenceRoutes from "./api/geofences.js";


dotenv.config();
const app = express();

// --------------------------
// Middleware setup
// --------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // HTTPS only in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// --------------------------
// Static and Views setup
// --------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// --------------------------
// Route Groups
// --------------------------
app.use("/api/parents", parentRoutes);
app.use("/api/children", childRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/geofences", geofenceRoutes);

// --------------------------
// EJS Page Routes
// --------------------------
app.get("/", (req, res) => {
  res.render("pages/index", { title: "Child Tracker" });
});
app.get("/about", (req, res) => {
  res.render("pages/about", { title: "About GetSet Kiddies" });
});

app.get("/login", (req, res) => {
  res.render("pages/login", { title: "Parent Login" });
});

app.get("/register", (req, res) => {
  res.render("pages/register", { title: "Parent Registration" });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/dashboard", {
    title: "Get Set Kiddies",
    parent: req.session.parent,
  });
});

app.get("/register-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/register-child", {
    title: "Get Set Kiddies",
    parent: req.session.parent,
  });
});

app.get("/track-child", (req, res) => res.redirect("/api/parents"));

app.get("/geofence-setup", (req, res) => res.redirect("/api/geofences/setup"));

app.get("/geofence-view", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parent = req.session.parent;

  const sql = `
    SELECT 
      g.id AS geofence_id, g.name AS geofence_name, g.latitude AS fence_lat, g.longitude AS fence_lng, g.radius,
      c.id AS child_id, c.firstname, c.lastname,
      l.latitude AS child_lat, l.longitude AS child_lng, l.date_time
    FROM geofences AS g
    JOIN registered_children AS c ON g.child_id = c.id
    LEFT JOIN (
      SELECT l1.*
      FROM locations l1
      JOIN (
        SELECT child_id, MAX(date_time) AS latest
        FROM locations
        GROUP BY child_id
      ) l2 ON l1.child_id = l2.child_id AND l1.date_time = l2.latest
    ) AS l ON c.id = l.child_id
    WHERE c.parent_id = ?
    ORDER BY g.created_at DESC
  `;

  db.query(sql, [parent.id], (err, rows) => {
    if (err) {
      console.error("Error fetching geofences:", err);
      return res.status(500).send("Database error");
    }

    console.log("/geofence-view route triggered");
    console.log("Fetched geofences:", rows);

    res.render("pages/geofence-view", {
      title: "View Geofences",
      parent,
      geofences: rows,
    });
  });
});



app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page Not Found" });
});

// --------------------------
// Server
// --------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
