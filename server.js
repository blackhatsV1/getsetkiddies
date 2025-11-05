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
app.set("views", path.join(__dirname, "views"));

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
          safezone_location: row.readable_address || 'Not set',
        });
      }
      if (row.latitude && row.longitude) {
        childrenMap.get(row.id).current_location =
          row.readable_address || `Lat: ${row.latitude}, Lng: ${row.longitude}`;
      }
    });

    const childrenWithGeofence = Array.from(childrenMap.values()).map(child => {
      return new Promise((resolve) => {
        const safezoneSql =
          "SELECT geofence_lat, geofence_lng, geofence_radius FROM registered_children WHERE id = ?";
        db.query(safezoneSql, [child.id], (err, safezoneResults) => {
          if (err) {
            console.error("Error fetching safezone:", err);
            child.safezone = "Not set";
            child.outside_safezone = false;
          } else if (safezoneResults.length > 0 && safezoneResults[0].geofence_lat) {
            const geo = safezoneResults[0];
            // Check if coordinates match preset locations (rounded to 4 decimal places)
            const presets = {
              '10.7147,122.5621': 'University of Iloilo',
              '10.8322,122.4156': 'Tubungan Public Market',
              '10.7833,122.3833': 'Leon Public Market'
            };
            const coordKey = `${parseFloat(geo.geofence_lat).toFixed(4)},${parseFloat(geo.geofence_lng).toFixed(4)}`;
            const locationName = presets[coordKey];

            // ✅ Cleaned-up version (no merge conflict)
            if (locationName) {
              child.safezone = `${locationName} (${geo.geofence_radius}m radius)`;
            } else {
              child.safezone = `Custom Location (${geo.geofence_radius}m radius)`;
            }

            // Check if child is outside safezone
            if (child.current_location && child.current_location !== "No location data") {
              // Extract latitude and longitude from current_location
              let childLat, childLng;
              if (child.current_location.startsWith("Lat: ")) {
                const coords = child.current_location.match(/Lat:\s*(-?\d+\.\d+),\s*Lng:\s*(-?\d+\.\d+)/);
                if (coords) {
                  childLat = parseFloat(coords[1]);
                  childLng = parseFloat(coords[2]);
                }
              } else {
                // For readable addresses, we need to get coordinates from locations table
                const locationSql = "SELECT latitude, longitude FROM locations WHERE child_id = ? ORDER BY date_time DESC LIMIT 1";
                db.query(locationSql, [child.id], (err, locResults) => {
                  if (!err && locResults.length > 0) {
                    childLat = parseFloat(locResults[0].latitude);
                    childLng = parseFloat(locResults[0].longitude);
                  }
                  calculateDistance(child, childLat, childLng, geo.geofence_lat, geo.geofence_lng, geo.geofence_radius, resolve);
                });
                return; // Exit early, resolve will be called in calculateDistance
              }
              calculateDistance(child, childLat, childLng, geo.geofence_lat, geo.geofence_lng, geo.geofence_radius, resolve);
            } else {
              child.outside_safezone = false;
              resolve(child);
            }
          } else {
            child.safezone = "Not set";
            child.outside_safezone = false;
            resolve(child);
          }
        });
      });
    });

    function calculateDistance(child, childLat, childLng, geoLat, geoLng, radius, resolve) {
      if (childLat && childLng) {
        // Haversine formula to calculate distance
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (childLat * Math.PI) / 180;
        const φ2 = (geoLat * Math.PI) / 180;
        const Δφ = ((geoLat - childLat) * Math.PI) / 180;
        const Δλ = ((geoLng - childLng) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c; // Distance in meters
        child.outside_safezone = distance > radius;
        console.log(`Child ${child.id}: distance=${distance.toFixed(2)}m, radius=${radius}m, outside=${child.outside_safezone}`);
      } else {
        child.outside_safezone = false;
      }
      resolve(child);
    }

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

  const parentId = req.session.parent.id;
  const childId = req.query.child_id;

  // Fetch parent's children
  const childrenSql = "SELECT id, firstname, lastname FROM registered_children WHERE parent_id = ?";
  db.query(childrenSql, [parentId], (err, childrenResults) => {
    if (err) {
      console.error("Error fetching children:", err);
      return res.status(500).send("Database error");
    }

    let selectedChild = null;
    let childLocation = null;

    if (childId) {
      selectedChild = childrenResults.find(child => child.id == childId);
      if (selectedChild) {
        // Fetch last location for the selected child
        const locationSql = `
          SELECT latitude, longitude, readable_address, date_time
          FROM locations
          WHERE child_id = ?
          ORDER BY date_time DESC
          LIMIT 1
        `;
        db.query(locationSql, [childId], (err, locationResults) => {
          if (err) {
            console.error("Error fetching location:", err);
          } else if (locationResults.length > 0) {
            childLocation = locationResults[0];
          }

          res.render("pages/track-child", {
            title: "Track Child",
            parent: req.session.parent,
            children: childrenResults,
            selectedChild,
            childLocation
          });
        });
      } else {
        res.render("pages/track-child", {
          title: "Track Child",
          parent: req.session.parent,
          children: childrenResults,
          selectedChild: null,
          childLocation: null
        });
      }
    } else {
      res.render("pages/track-child", {
        title: "Track Child",
        parent: req.session.parent,
        children: childrenResults,
        selectedChild: null,
        childLocation: null
      });
    }
  });
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
      title: "Safezone Settings",
      parent: req.session.parent,
      children: results,
    });
  });
});

app.get("/profile", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parentId = req.session.parent.id;

  // Fetch parent details including description
  const parentSql = "SELECT * FROM parents WHERE id = ?";
  db.query(parentSql, [parentId], (err, parentResults) => {
    if (err) {
      console.error("Error fetching parent:", err);
      return res.status(500).send("Database error");
    }

    if (parentResults.length === 0) {
      return res.status(404).send("Parent not found");
    }

    const parent = parentResults[0];

    // Fetch children
    const childrenSql = "SELECT id, firstname, lastname FROM registered_children WHERE parent_id = ?";
    db.query(childrenSql, [parentId], (err, childrenResults) => {
      if (err) {
        console.error("Error fetching children:", err);
        return res.status(500).send("Database error");
      }

      res.render("pages/profile", {
        title: "Parent Profile",
        parent: parent,
        children: childrenResults,
      });
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
