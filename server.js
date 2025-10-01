const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 80;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// In-memory database (replace with MongoDB/MySQL in production)
let users = [];
let orders = [];
let products = [];

// Load products from your frontend data
const loadProducts = () => {
    products = [
        {
            id: 1,
            name: "Chef Knife", 
            price: 420, 
            img: "chefknife.png",
            category: "cutlery",
            description: "Professional-grade chef knife perfect for precision cutting, slicing, and dicing.",
            specifications: {
                "Material": "High-Carbon Stainless Steel",
                "Blade Length": "8 inches",
                "Handle": "Ergonomic Pakkawood",
                "Weight": "250g",
                "Care": "Hand wash only"
            }
        },
        {
            id: 2,
            name: "Non-stick Pan", 
            price: 3500, 
            img: "nonstick.png",
            category: "cookware",
            description: "Premium non-stick frying pan with even heat distribution.",
            specifications: {
                "Material": "Aluminum with Ceramic Coating",
                "Diameter": "28 cm",
                "Heat Resistance": "Up to 260°C",
                "Dishwasher Safe": "Yes",
                "Warranty": "2 years"
            }
        }
        // Add all your other products here...
    ];
};

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, 'your_secret_key');
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// API Routes

// Get all products
app.get("/api/products", (req, res) => {
    res.json(products);
});

// User registration
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            phone,
            createdAt: new Date()
        };

        users.push(user);

        // Create token
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            'your_secret_key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: "User created successfully",
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
        });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// User login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid password" });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            'your_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
        });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Create order
app.post("/api/orders", authenticate, (req, res) => {
    try {
        const { items, total, shippingAddress, paymentMethod, phone } = req.body;

        const order = {
            id: `ORD${Date.now()}`,
            userId: req.user.id,
            items,
            total,
            shippingAddress,
            paymentMethod,
            phone,
            status: "pending",
            createdAt: new Date()
        };

        orders.push(order);

        res.status(201).json({
            message: "Order created successfully",
            order
        });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get user orders
app.get("/api/orders", authenticate, (req, res) => {
    try {
        const userOrders = orders.filter(order => order.userId === req.user.id);
        res.json(userOrders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update order status (for admin)
app.patch("/api/orders/:orderId", authenticate, (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = orders.find(order => order.id === orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        order.status = status;
        order.updatedAt = new Date();

        res.json({
            message: "Order updated successfully",
            order
        });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Serve HTML files for all other routes (SPA support)
app.get("*", (req, res) => {
    const filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            // If file not found, serve index.html for SPA routing
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
                    if (err) {
                        res.writeHead(404, {"Content-Type":"text/html"});
                        res.end("<h1>404 Not Found</h1><a href='/'>Back to Home</a>");
                    } else {
                        res.writeHead(200, {"Content-Type":"text/html"});
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500, {"Content-Type":"text/html"});
                res.end("<h1>500 Server Error</h1>");
            }
        } else {
            const extname = path.extname(filePath);
            let contentType = 'text/html';
            
            switch (extname) {
                case '.js':
                    contentType = 'text/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.jpg':
                    contentType = 'image/jpg';
                    break;
            }
            
            res.writeHead(200, {"Content-Type": contentType});
            res.end(content);
        }
    });
});

// Initialize products
loadProducts();

// Add some sample orders for testing
orders.push(
    {
        id: "ORD001",
        userId: 1,
        items: [
            { name: "Chef Knife", price: 420, quantity: 1, image: "chefknife.png" },
            { name: "Wooden Spoon", price: 450, quantity: 2, image: "woodenspoon.png" }
        ],
        total: 1320,
        shippingAddress: "123 Main St, Dhaka",
        paymentMethod: "Cash on Delivery",
        phone: "01712345678",
        status: "delivered",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
        id: "ORD002",
        userId: 1,
        items: [
            { name: "Non-stick Pan", price: 3500, quantity: 1, image: "nonstick.png" }
        ],
        total: 3500,
        shippingAddress: "123 Main St, Dhaka",
        paymentMethod: "Cash on Delivery",
        phone: "01712345678",
        status: "shipped",
        createdAt: new Date()
    }
);

// Add a sample user for testing
users.push({
    id: 1,
    name: "Demo User",
    email: "demo@example.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    phone: "01712345678",
    createdAt: new Date()
});

app.listen(PORT, () => {
    console.log(`Server running at http://ecommerce.local`);
    console.log(`API endpoints available at http://ecommerce.local/api/`);
});