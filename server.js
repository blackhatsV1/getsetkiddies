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
import geofenceRoutes from "./api/geofence.js";
import expressListEndpoints from "express-list-endpoints";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// ✅ Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // use true only if HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// ✅ Routes
console.log("✅ Children route module loaded:", !!childRoutes);

app.use("/api/parents", parentRoutes);
app.use("/api/children", childRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/geofence", geofenceRoutes);

// ✅ View routes
app.get("/", (req, res) => res.render("pages/index", { title: "Child Tracker" }));

app.get("/login", (req, res) => res.render("pages/login"));

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
          geofence_location: row.readable_address || 'Not set',
        });
      }
      if (row.latitude && row.longitude) {
        childrenMap.get(row.id).current_location =
          row.readable_address || `Lat: ${row.latitude}, Lng: ${row.longitude}`;
      }
    });

    const childrenWithGeofence = Array.from(childrenMap.values()).map(child => {
      return new Promise((resolve) => {
        const geofenceSql =
          "SELECT geofence_lat, geofence_lng, geofence_radius FROM registered_children WHERE id = ?";
        db.query(geofenceSql, [child.id], (err, geofenceResults) => {
          if (err) {
            console.error("Error fetching geofence:", err);
            child.geofence = "Not set";
          } else if (geofenceResults.length > 0 && geofenceResults[0].geofence_lat) {
            const geo = geofenceResults[0];
            child.geofence = `Lat: ${geo.geofence_lat}, Lng: ${geo.geofence_lng}, Radius: ${geo.geofence_radius}m`;
          } else {
            child.geofence = "Not set";
          }
          resolve(child);
        });
      });
    });

    Promise.all(childrenWithGeofence)
      .then(children => {
        const finalChildren = children.map(child => ({
          ...child,
          current_location: child.current_location || "No location data",
        }));

        res.render("pages/dashboard", {
          title: "Get Set Kiddies",
          parent: req.session.parent,
          children: finalChildren,
        });
      })
      .catch(err => {
        console.error("Error processing children data:", err);
        res.status(500).send("Database error");
      });
  });
});

app.get("/track-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/track-child", { title: "Get Set Kiddies", parent: req.session.parent });
});

app.get("/register-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/register-child", { title: "Get Set Kiddies", parent: req.session.parent });
});

app.get("/geofence-settings", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parentId = req.session.parent.id;
  const sql = "SELECT id, firstname, lastname FROM registered_children WHERE parent_id = ?";
  db.query(sql, [parentId], (err, results) => {
    if (err) {
      console.error("Error fetching children:", err);
      return res.status(500).send("Database error");
    }

    res.render("pages/geofence-settings", {
      title: "Geofence Settings",
      parent: req.session.parent,
      children: results,
    });
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  const routes = expressListEndpoints(app);
  routes.forEach(r => console.log(`Route: ${r.path} → [${r.methods.join(", ")}]`));
});
