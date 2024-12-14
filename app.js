const express = require('express');
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

// JSON database file path
const databasePath = './data/database.json';

// Load initial data from JSON
let database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

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

    console.log('--- Add/Update Product Request ---');
    console.log('Received Data:', { itemName, itemCategory, itemPrice, itemQuantity, itemImage });

    // Find the product in the database
    const existingProduct = database.item.find(
        (product) =>
            product.ProductName.toLowerCase() === itemName.toLowerCase() &&
            product.ProductCategory.toLowerCase() === itemCategory.toLowerCase()
    );

    if (existingProduct) {
        // Update existing product
        existingProduct.ProductPrice = parseFloat(itemPrice);
        existingProduct.ProductQuantity += parseInt(itemQuantity, 10);
        existingProduct.productImage = itemImage || existingProduct.productImage;
        console.log('Product updated successfully');
    } else {
        // Add new product
        database.item.push({
            ProductName: itemName,
            ProductCategory: itemCategory,
            ProductPrice: parseFloat(itemPrice),
            ProductQuantity: parseInt(itemQuantity, 10),
            productImage: itemImage,
        });
        console.log('Product added successfully');
    }

    // Write the updated database back to the JSON file
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');

    res.status(200).json({ message: 'Product added/updated successfully' });
});

// Fetch all products endpoint
app.get('/get-products', (req, res) => {
    res.status(200).json(database.item);
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
