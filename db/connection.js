import mysql from "mysql2/promise"; 
import dotenv from "dotenv"; 
dotenv.config(); 
const isProduction = process.env.NODE_ENV === "production"; 
const db = mysql.createPool({ 
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASS, 
  database: process.env.DB_NAME, 
  port: process.env.DB_PORT || 3306, 
  ssl: isProduction ? { rejectUnauthorized: true } : undefined, 
  waitForConnections: true, 
  connectionLimit: 10, 
  queueLimit: 0, 
}); 
export default db;
