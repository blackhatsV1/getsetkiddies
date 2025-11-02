import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import mysql from "mysql2";
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
  res.render("pages/dashboard", {title: "Get Set Kiddies", parent: req.session.parent });
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
