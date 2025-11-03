import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import mysql from "mysql2";
import db from "./db/connection.js";
import parentRoutes from "./api/parents.js";
import childRoutes from "./api/children.js";
import locationRoutes from "./api/locations.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey", // can set in .env
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true only if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Use APIs
app.use("/api/parents", parentRoutes);
app.use("/api/children", childRoutes);
app.use("/api/locations", locationRoutes);

app.get("/", (req, res) => res.render("pages/index", { title: "Child Tracker" }));


app.get("/", (req, res) => {
  res.render("pages/index", { title: "Child Tracker" });
});

app.get("/login", (req, res) => {
  res.render("pages/login", { title: "Parent Login" });
});

app.get("/register", (req, res) => {
  res.render("pages/register", { title: "Parent Registration" });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parentId = req.session.parent.id;
  const sql = `
    SELECT rc.id, rc.firstname, rc.lastname, rc.child_age, rc.child_gender, rc.date_registered,
           l.latitude, l.longitude, l.readable_address, l.date_time as last_location_time
    FROM registered_children rc
    LEFT JOIN locations l ON rc.id = l.child_id
    WHERE rc.parent_id = ?
    ORDER BY rc.id, l.date_time DESC
  `;

  db.query(sql, [parentId], (err, results) => {
    if (err) {
      console.error("Error fetching children:", err);
      return res.status(500).send("Database error");
    }

    // Group locations by child_id, keeping only the latest location
    const childrenMap = new Map();
    results.forEach(row => {
      if (!childrenMap.has(row.id)) {
        childrenMap.set(row.id, {
          id: row.id,
          firstname: row.firstname,
          lastname: row.lastname,
          child_age: row.child_age,
          child_gender: row.child_gender,
          date_registered: row.date_registered,
          current_location: null,
          geofence_location: row.readable_address || 'Not set' // Assuming geofence is home address or something similar
        });
      }
      // Update with latest location if available
      if (row.latitude && row.longitude) {
        childrenMap.get(row.id).current_location = `${row.readable_address || `Lat: ${row.latitude}, Lng: ${row.longitude}`}`;
      }
    });

    const children = Array.from(childrenMap.values()).map(child => ({
      ...child,
      current_location: child.current_location || 'No location data'
    }));

    res.render("pages/dashboard", {title: "Get Set Kiddies", parent: req.session.parent, children: children });
  });
});

app.get("/track-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/track-child", {title: "Get Set Kiddies", parent: req.session.parent });
});

app.get("/register-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/register-child", {title: "Get Set Kiddies", parent: req.session.parent });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
