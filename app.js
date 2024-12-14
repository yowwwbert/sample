// Required dependencies
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ace',
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

// Add or update product endpoint
app.post('/add-product', upload.single('itemImage'), (req, res) => {
    const { itemName, itemCategory, itemPrice, itemQuantity } = req.body;
    const itemImage = req.file ? '/uploads/' + req.file.filename : null;

    // Log received data
    console.log('--- Add/Update Product Request ---');
    console.log('Received Data:', { itemName, itemCategory, itemPrice, itemQuantity, itemImage });

    // Trim inputs
    const trimmedItemName = itemName.trim();
    const trimmedItemCategory = itemCategory.trim();

    // Check if the product already exists
    const checkQuery = `
        SELECT * FROM item 
        WHERE LOWER(ProductName) = LOWER(?) AND LOWER(ProductCategory) = LOWER(?)
    `;

    connection.query(checkQuery, [trimmedItemName, trimmedItemCategory], (err, results) => {
        if (err) {
            console.error('Error checking for existing product:', err);
            return res.status(500).json({ error: 'Failed to check for existing product' });
        }

        // Log results of existence check
        console.log('Check Query Results:', results);

        if (results.length > 0) { // If product exists
            // Product exists, perform an update
            const updateQuery = `
                UPDATE item 
                SET ProductPrice = ?, 
                    ProductQuantity = ProductQuantity + ?,
                    productImage = COALESCE(?, productImage)
                WHERE LOWER(ProductName) = LOWER(?) AND LOWER(ProductCategory) = LOWER(?)
            `;

            connection.query(updateQuery, [itemPrice, itemQuantity, itemImage, trimmedItemName, trimmedItemCategory], (err) => {
                if (err) {
                    console.error('Update error:', err);
                    return res.status(500).json({ error: 'Failed to update product' });
                }

                console.log('Product updated successfully');
                return res.status(200).json({ message: 'Product updated successfully' });
            });
        } else {
            // Product does not exist, perform an insert
            const insertQuery = `
                INSERT INTO item (ProductName, ProductCategory, ProductPrice, ProductQuantity, productImage)
                VALUES (?, ?, ?, ?, ?)
            `;

            connection.query(insertQuery, [trimmedItemName, trimmedItemCategory, itemPrice, itemQuantity, itemImage], (err) => {
                if (err) {
                    console.error('Insert error:', err);
                    return res.status(500).json({ error: 'Failed to add product' });
                }

                console.log('Product added successfully');
                return res.status(200).json({ message: 'Product added successfully' });
            });
        }
    });
});

// Fetch all products endpoint
app.get('/get-products', (req, res) => {
    const query = 'SELECT * FROM item';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error during SELECT all:', err);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
        console.log('Fetched Products:', results);
        res.status(200).json(results);
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
