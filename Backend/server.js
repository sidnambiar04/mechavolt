import express from "express";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { dirname as pathDirname, join } from "path";
import session from "express-session";
import pkg from "pg"; // Import pg as a CommonJS module
const { Pool } = pkg; // Destructure Pool from the pg package
import bcrypt from "bcrypt";

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
    res.render("home", { user: req.session.user || null });
});

app.get("/home", (req, res) => {
    res.render("home", { user: req.session.user || null });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post('/login', async (req, res) => {
    const { email, password, userType } = req.body;

    try {
        let user;
        if (userType === 'Admin') {
            // Check in Admins table
            const result = await pool.query('SELECT * FROM Admins WHERE email = $1', [email]);
            user = result.rows[0];
        } else if (userType === 'driver') {
            // Check in Customers table
            const result = await pool.query('SELECT * FROM customer WHERE email = $1', [email]);
            user = result.rows[0];
        } else {
            return res.status(400).send('Invalid user type'); // Error if userType is invalid
        }

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid credentials');
        }

        // Store user session
        req.session.user = { id: user.id, name: user.name, email: user.email, userType };

        // Redirect based on user type
        if (userType === 'Admin') {
            res.redirect('/admin/dashboard'); // Admin dashboard
        } else if (userType === 'driver') {
            res.redirect('/home'); // Customer home page
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error');
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post('/register', async (req, res) => {
    const { name, email, password, userType } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        if (userType === "Admin") {
            // Save to Admins table
            await pool.query(
                "INSERT INTO Admins (name, email, password) VALUES ($1, $2, $3)",
                [name, email, hashedPassword]
            );
        } else if (userType === "driver") {
            // Save to customer table
            await pool.query(
                "INSERT INTO customer (name, email, password, usertype) VALUES ($1, $2, $3, $4)",
                [name, email, hashedPassword, userType]
            );
        } else {
            return res.status(400).send("Invalid user type"); // Error if userType is invalid
        }

        // Redirect to login page after successful registration
        res.redirect("/login");
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).send("Server error");
    }
});

app.get("/contacts", (req, res) => {
    res.render("contacts", { user: req.session.user || null });
});

app.get("/services", (req, res) => {
    res.render("services", { user: req.session.user || null });
});

app.get("/register/appointment", (req, res) => {
    console.log("Appointment page accessed");
    res.render("appointment");
});

app.get("/about", (req, res) => {
    res.render("about", { user: req.session.user || null });
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

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Server error");
        }
        res.redirect("/login");
    });
});

app.get("/insurance-advisor", (req, res) => {
    res.render("insurance-advisor");
});

app.post("/insurance-advisor/recommendations", (req, res) => {
    const { vehicleType, vehicleAge, usage, budget } = req.body;

    // Example logic to generate recommendations
    const recommendations = [];

    if (vehicleType === "car") {
        if (vehicleAge <= 5) {
            recommendations.push("Comprehensive Car Insurance - Premium Plan");
        } else {
            recommendations.push("Third-Party Car Insurance - Basic Plan");
        }
    } else if (vehicleType === "bike") {
        recommendations.push("Two-Wheeler Insurance - Standard Plan");
    } else if (vehicleType === "truck") {
        recommendations.push("Commercial Vehicle Insurance - Heavy Load Plan");
    }

    if (budget < 5000) {
        recommendations.push("Budget-Friendly Insurance Options");
    }

    // Render the recommendations page
    res.render("insurance-recommendations", { recommendations });
});

app.post('/api/chatbot', (req, res) => {
    const { vehicleType, vehicleAge, usage, budget } = req.body;

    // Example logic to generate recommendations
    const recommendations = [];

    if (vehicleType === 'car') {
        if (vehicleAge <= 5) {
            recommendations.push('Comprehensive Car Insurance - Premium Plan');
        } else {
            recommendations.push('Third-Party Car Insurance - Basic Plan');
        }
    } else if (vehicleType === 'bike') {
        recommendations.push('Two-Wheeler Insurance - Standard Plan');
    } else if (vehicleType === 'truck') {
        recommendations.push('Commercial Vehicle Insurance - Heavy Load Plan');
    }

    if (budget < 5000) {
        recommendations.push('Budget-Friendly Insurance Options');
    }

    // Send recommendations to the chatbot or directly to the frontend
    res.json({ recommendations });
});

app.get("/ev-stations", async (req, res) => {
    try {
        // Fetch all EV stations with limited details
        const result = await pool.query("SELECT id, name, image, time, contact, latitude, longitude FROM EVStations");
        const evStations = result.rows; // Get the rows from the query result
        res.render("ev-stations", { evStations }); // Pass the data to the view
    } catch (err) {
        console.error("Error fetching EV stations:", err);
        res.status(500).send("Server error");
    }
});

app.get("/ev-stations/:id", async (req, res) => {
    const stationId = parseInt(req.params.id);

    try {
        // Fetch details of the specific EV station
        const result = await pool.query("SELECT * FROM EVStations WHERE id = $1", [stationId]);
        const station = result.rows[0]; // Get the first row (station details)

        if (!station) {
            return res.status(404).send("Station not found");
        }

        // Generate Google Maps link using latitude and longitude
        const googleMapsLink = `https://www.google.com/maps?q=${station.latitude},${station.longitude}`;

        res.render("ev-station-details", { station, googleMapsLink }); // Pass data to the view
    } catch (err) {
        console.error("Error fetching station details:", err);
        res.status(500).send("Server error");
    }
});

app.get("/ev-stations/nearby", async (req, res) => {
    const { lat, lng } = req.query;

    try {
        // Fetch nearby EV stations based on user's location
        const result = await pool.query(
            `SELECT id, name, image, time, contact, latitude, longitude
             FROM EVStations
             WHERE earth_distance(ll_to_earth($1, $2), ll_to_earth(latitude, longitude)) < 5000`,
            [lat, lng]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching nearby EV stations:", err);
        res.status(500).send("Server error");
    }
});

app.get("/repair-shops", async (req, res) => {
    try {
        // Fetch all repair shops with required details
        const result = await pool.query("SELECT id, name, image, time, contact, rating, latitude, longitude FROM RepairShops");
        const repairShops = result.rows; // Get the rows from the query result
        res.render("repair-shops", { repairShops }); // Pass the data to the view
    } catch (err) {
        console.error("Error fetching repair shops:", err);
        res.status(500).send("Server error");
    }
});

app.get("/repair-shops/:id", async (req, res) => {
    const shopId = parseInt(req.params.id);

    try {
        // Fetch all columns for the detailed view
        const result = await pool.query("SELECT * FROM RepairShops WHERE id = $1", [shopId]);
        const shop = result.rows[0]; // Get the first row (shop details)

        if (!shop) {
            return res.status(404).send("Shop not found");
        }

        // Generate Google Maps link using latitude and longitude
        const googleMapsLink = `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`;

        res.render("repair-shop-details", { shop, googleMapsLink }); // Pass data to the view
    } catch (err) {
        console.error("Error fetching shop details:", err);
        res.status(500).send("Server error");
    }
});

app.get("/battery-services", async (req, res) => {
    try {
        // Fetch all battery services
        const result = await pool.query("SELECT id, type, image, description FROM BatteryServices");
        const batteryServices = result.rows; // Get the rows from the query result
        res.render("battery-services", { batteryServices }); // Pass data to the view
    } catch (err) {
        console.error("Error fetching battery services:", err);
        res.status(500).send("Server error");
    }
});

app.get("/battery-services/:id", async (req, res) => {
    const serviceId = parseInt(req.params.id);

    try {
        // Fetch details of the specific battery service
        const result = await pool.query("SELECT * FROM BatteryServices WHERE id = $1", [serviceId]);
        const service = result.rows[0]; // Get the first row (service details)

        if (!service) {
            return res.status(404).send("Service not found");
        }

        res.render("battery-service-details", { service }); // Pass data to the view
    } catch (err) {
        console.error("Error fetching battery service details:", err);
        res.status(500).send("Server error");
    }
});

app.get("/software-services", async (req, res) => {
    try {
        // Fetch all software services
        const result = await pool.query("SELECT id, name, image, estimated_amount FROM SoftwareServices");
        const softwareServices = result.rows; // Get the rows from the query result
        res.render("software-services", { softwareServices }); // Pass the data to the view
    } catch (err) {
        console.error("Error fetching software services:", err);
        res.status(500).send("Server error");
    }
});

app.get("/software-services/:id", async (req, res) => {
    const serviceId = parseInt(req.params.id);

    try {
        // Fetch details of the specific software service
        const result = await pool.query("SELECT * FROM SoftwareServices WHERE id = $1", [serviceId]);
        const service = result.rows[0]; // Get the first row (service details)

        if (!service) {
            return res.status(404).send("Service not found");
        }

        res.render("software-service-details", { service }); // Pass data to the view
    } catch (err) {
        console.error("Error fetching software service details:", err);
        res.status(500).send("Server error");
    }
});

app.get('/admin/dashboard', async (req, res) => {
    try {
        // Fetch counts for each service category
        const evStationsResult = await pool.query('SELECT COUNT(*) AS count FROM EVStations');
        const repairShopsResult = await pool.query('SELECT COUNT(*) AS count FROM RepairShops');
        const batteryServicesResult = await pool.query('SELECT COUNT(*) AS count FROM BatteryServices');
        const softwareServicesResult = await pool.query('SELECT COUNT(*) AS count FROM SoftwareServices');
        const roadsideAssistanceResult = await pool.query('SELECT COUNT(*) AS count FROM RoadsideAssistance');

        // Hardcoded data for Vehicle Insurance (from insurance-advisor.ejs)
        const vehicleInsuranceProviders = [
            { name: 'ACKO General Insurance Ltd.', website: 'https://www.acko.com/?redirect=false', claimSettlementRatio: '96.27%' },
            { name: 'Bajaj Allianz General Insurance Co. Ltd.', website: 'https://www.bajajallianz.com/', claimSettlementRatio: '98.5%' },
            { name: 'National Insurance Co. Ltd.', website: 'https://nationalinsurance.nic.co.in/', claimSettlementRatio: '93%' },
            { name: 'HDFC ERGO General Insurance Co. Ltd.', website: 'https://www.hdfcergo.com/', claimSettlementRatio: '99%' },
            { name: 'Tata AIG General Insurance Co. Ltd.', website: 'https://www.tataaig.com/', claimSettlementRatio: '99%' },
            { name: 'Cholamandalam MS General Insurance Co. Ltd.', website: 'https://www.cholainsurance.com/', claimSettlementRatio: '96%' },
            { name: 'Kotak Mahindra General Insurance Co. Ltd.', website: 'https://www.zurichkotak.com/', claimSettlementRatio: '98%' },
            { name: 'Reliance General Insurance Co. Ltd.', website: 'https://www.reliancegeneral.co.in/', claimSettlementRatio: '98%' },
            { name: 'The New India Assurance Co. Ltd.', website: 'https://www.newindia.co.in/', claimSettlementRatio: '90%' },
        ];

        // Prepare the services array
        const services = [
            { name: 'EV Charging Station', shop_count: evStationsResult.rows[0].count || 0 },
            { name: 'Vehicle Repair and Servicing', shop_count: repairShopsResult.rows[0].count || 0 },
            { name: 'Car Battery Repair and Servicing', shop_count: batteryServicesResult.rows[0].count || 0 },
            { name: 'Software Support and Updates', shop_count: softwareServicesResult.rows[0].count || 0 },
            { name: 'Roadside Assistance', shop_count: roadsideAssistanceResult.rows[0].count || 0 },
            { name: 'Vehicle Insurance', shop_count: vehicleInsuranceProviders.length }, // Use the length of the hardcoded array
        ];

        // Render the admin dashboard with the service data
        res.render('admin-dashboard', { services });
    } catch (err) {
        console.error('Error fetching service counts:', err);
        res.status(500).send('Server error');
    }
});

app.get('/admin/shops/:serviceName', async (req, res) => {
    const { serviceName } = req.params;

    try {
        if (serviceName === 'EV Charging Station') {
            const result = await pool.query(
                'SELECT id, name, image, time, contact, latitude, longitude, address, website, type FROM EVStations'
            );
            const evStations = result.rows;
            res.render('ev-stations-admin', { serviceName, evStations });
        } else if (serviceName === 'Vehicle Repair and Servicing') {
            const result = await pool.query(
                'SELECT id, name, contact, address, time FROM RepairShops'
            );
            const repairShops = result.rows;
            res.render('repair-shops-admin', { serviceName, repairShops });
        } else if (serviceName === 'Car Battery Repair and Servicing') {
            const result = await pool.query(
                'SELECT id, type, recommended_service_link FROM BatteryServices'
            );
            const batteryServices = result.rows;
            res.render('battery-services-admin', { serviceName, batteryServices });
        } else if (serviceName === 'Software Support and Updates') {
            const result = await pool.query(
                'SELECT id, name, estimated_amount FROM SoftwareServices'
            );
            const softwareServices = result.rows;
            res.render('software-services-admin', { serviceName, softwareServices });
        } else if (serviceName === 'Vehicle Insurance') {
            // Hardcoded data for Vehicle Insurance
            const vehicleInsuranceProviders = [
                { name: 'ACKO General Insurance Ltd.', website: 'https://www.acko.com/?redirect=false', claimSettlementRatio: '96.27%' },
                { name: 'Bajaj Allianz General Insurance Co. Ltd.', website: 'https://www.bajajallianz.com/', claimSettlementRatio: '98.5%' },
                { name: 'National Insurance Co. Ltd.', website: 'https://nationalinsurance.nic.co.in/', claimSettlementRatio: '93%' },
                { name: 'HDFC ERGO General Insurance Co. Ltd.', website: 'https://www.hdfcergo.com/', claimSettlementRatio: '99%' },
                { name: 'Tata AIG General Insurance Co. Ltd.', website: 'https://www.tataaig.com/', claimSettlementRatio: '99%' },
                { name: 'Cholamandalam MS General Insurance Co. Ltd.', website: 'https://www.cholainsurance.com/', claimSettlementRatio: '96%' },
                { name: 'Kotak Mahindra General Insurance Co. Ltd.', website: 'https://www.zurichkotak.com/', claimSettlementRatio: '98%' },
                { name: 'Reliance General Insurance Co. Ltd.', website: 'https://www.reliancegeneral.co.in/', claimSettlementRatio: '98%' },
                { name: 'The New India Assurance Co. Ltd.', website: 'https://www.newindia.co.in/', claimSettlementRatio: '90%' },
            ];
            res.render('vehicle-insurance-admin', { serviceName, vehicleInsuranceProviders });
        } else if (serviceName === 'Roadside Assistance') {
            // Fetch roadside assistance data
            const result = await pool.query(
                'SELECT id, name, contact, address FROM RoadsideAssistance'
            );
            const roadsideShops = result.rows;
            res.render('roadside-assistance-admin', { serviceName, roadsideShops });
        } else {
            return res.status(404).send('Service not found');
        }
    } catch (err) {
        console.error(`Error fetching data for ${serviceName}:`, err);
        res.status(500).send('Server error');
    }
});

app.post('/admin/ev-stations/add', async (req, res) => {
    const { name, image, time, contact, latitude, longitude, address, website, type } = req.body;

    // Log the request body for debugging
    console.log('Request Body:', req.body);

    try {
        // Ensure latitude and longitude are numbers
        const latitudeNum = parseFloat(latitude);
        const longitudeNum = parseFloat(longitude);

        // Insert the new EV station into the database
        await pool.query(
            'INSERT INTO EVStations (name, image, time, address, contact, type, website, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [name, image, time, address, contact, type, website, latitudeNum, longitudeNum]
        );

        console.log('EV Station added successfully'); // Log success
        res.redirect('/admin/shops/EV Charging Station'); // Redirect back to the admin page
    } catch (err) {
        console.error('Error adding EV station:', err); // Log the error
        res.status(500).send('Server error');
    }
});

app.post('/admin/ev-stations/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the EV station from the database
        await pool.query('DELETE FROM EVStations WHERE id = $1', [id]);

        res.redirect('/admin/shops/EV Charging Station'); // Redirect back to the admin page
    } catch (err) {
        console.error('Error deleting EV station:', err);
        res.status(500).send('Server error');
    }
});

app.get("/roadside-assistance", async (req, res) => {
    try {
        // Fetch all roadside assistance shops from the database
        const result = await pool.query(
            "SELECT id, name, image, contact, address, latitude, longitude FROM RoadsideAssistance"
        );
        const roadsideShops = result.rows; // Get the rows from the query result

        // Render the roadside assistance page and pass the data
        res.render("roadside-assistance", { roadsideShops });
    } catch (err) {
        console.error("Error fetching roadside assistance shops:", err);
        res.status(500).send("Server error");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});