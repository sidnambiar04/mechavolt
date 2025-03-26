import express from "express";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { dirname as pathDirname, join } from "path";
import session from "express-session";
import pkg from "pg"; // Import pg as a CommonJS module
const { Pool } = pkg; // Destructure Pool from the pg package

const app = express();
const PORT = 3000;

// Correctly define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));
app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: false,
    })
);

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

// PostgreSQL connection configuration
const pool = new Pool({
    user: "postgres", // Replace with your PostgreSQL username
    host: "localhost",
    database: "mechavolt", // Replace with your database name
    password: "postgres123", // Replace with your PostgreSQL password
    port: 5432, // Default PostgreSQL port
});

// Test the database connection
pool.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err);
    } else {
        console.log("Connected to the PostgreSQL database");
    }
});

// Home Route
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/home", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/contacts", (req, res) => {
    res.render("contacts");
});

app.get("/services", (req, res) => {
    res.render("services");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/users", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).send("Server Error");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
