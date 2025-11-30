const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.matchPassword = async function(enteredPass) {
  return await bcrypt.compare(enteredPass, this.password);
};
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: String, description: String, price: Number, category: String, sizes: [String], image: String
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderItems: Array, totalPrice: Number, isPaid: { type: Boolean, default: true }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

// App Config
dotenv.config();
const app = express();
app.use(express.json());
// Allow all origins for simplicity in development
app.use(cors()); 

// Connect DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clothing_brand')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error:', err));

// --- ROUTES ---

// 1. Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'User exists' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
    res.status(201).json({ _id: user._id, name, email, token });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
      res.json({ _id: user._id, name: user.name, email, token });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 2. Products
app.get('/api/products', async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice, page = 1, limit = 9 } = req.query;
    let query = {};
    if (keyword) query.name = { $regex: keyword, $options: 'i' };
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    const count = await Product.countDocuments(query);
    const products = await Product.find(query).limit(Number(limit)).skip((page - 1) * limit);
    res.json({ products, totalPages: Math.ceil(count / limit) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  const p = await Product.findById(req.params.id);
  p ? res.json(p) : res.status(404).send('Not found');
});

// 3. Orders (Protected) with GMAIL INTEGRATION
const protect = async (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id);
      next();
    } catch (e) { res.status(401).json({ message: 'Not authorized' }); }
  } else { res.status(401).json({ message: 'No token' }); }
};

// --- UPDATED ORDER ROUTE WITH EMAIL ---
app.post('/api/orders', protect, async (req, res) => {
  try {
    // 1. Create Order in DB
    const order = await Order.create({ ...req.body, user: req.user._id });
    
    // 2. Configure Nodemailer
    // NOTE: You must use an App Password if using Gmail (Not your login password)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS
      }
    });

    // 3. Construct HTML Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.user.email, // Sends to the logged-in user
      subject: `Order Confirmation #${order._id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for your order, ${req.user.name}!</h2>
          <p>We have received your order and are processing it.</p>
          
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 5px 0; font-size: 1.2em;"><strong>Total: $${req.body.totalPrice}</strong></p>
          </div>

          <h3>Items Ordered:</h3>
          <ul style="list-style: none; padding: 0;">
            ${req.body.orderItems.map(item => `
              <li style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong>${item.name}</strong> <br/>
                <span style="color: #666;">Size: ${item.size} | Qty: ${item.qty} | Price: $${item.price}</span>
              </li>
            `).join('')}
          </ul>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #888;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `
    };

    // 4. Send Email (Async but we don't block the response)
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Email Error:", err);
      } else {
        console.log("Email Sent:", info.response);
      }
    });

    res.status(201).json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- EMERGENCY SEED ROUTE (USE THIS TO FIX EMPTY DB) ---
app.get('/api/seed-now', async (req, res) => {
  await Product.deleteMany({});
  const data = [
      { name: "Classic White Tee", description: "Premium cotton t-shirt", price: 25, category: "Men", sizes: ["S", "M", "L", "XL"], image: "https://placehold.co/400x500/e0e0e0/333333?text=White+Tee" },
      { name: "Slim Fit Chinos", description: "Versatile beige chinos", price: 45, category: "Men", sizes: ["30", "32", "34", "36"], image: "https://placehold.co/400x500/d2b48c/333333?text=Chinos" },
      { name: "Denim Jacket", description: "Vintage wash denim", price: 75, category: "Men", sizes: ["M", "L", "XL"], image: "https://placehold.co/400x500/3b5998/ffffff?text=Denim+Jacket" },
      { name: "Urban Hoodie", description: "Heavyweight fleece hoodie", price: 55, category: "Men", sizes: ["S", "M", "L", "XL"], image: "https://placehold.co/400x500/555555/ffffff?text=Hoodie" },
      { name: "Running Shorts", description: "Lightweight athletic shorts", price: 30, category: "Men", sizes: ["M", "L"], image: "https://placehold.co/400x500/222222/ffffff?text=Run+Shorts" },
      { name: "Leather Belt", description: "Genuine leather belt", price: 20, category: "Men", sizes: ["M", "L"], image: "https://placehold.co/400x500/8b4513/ffffff?text=Belt" },
      { name: "Oxford Shirt", description: "Light blue button-down", price: 60, category: "Men", sizes: ["M", "L", "XL"], image: "https://placehold.co/400x500/add8e6/333333?text=Oxford+Shirt" },
      // WOMEN
      { name: "Floral Summer Dress", description: "Light and breezy dress", price: 50, category: "Women", sizes: ["XS", "S", "M", "L"], image: "https://placehold.co/400x500/ffb6c1/333333?text=Floral+Dress" },
      { name: "High-Waist Jeans", description: "Classic blue jeans", price: 65, category: "Women", sizes: ["26", "28", "30", "32"], image: "https://placehold.co/400x500/4682b4/ffffff?text=High+Waist+Jeans" },
      { name: "Knit Sweater", description: "Cozy oversized sweater", price: 55, category: "Women", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/fffdd0/333333?text=Knit+Sweater" },
      { name: "Silk Blouse", description: "Elegant black silk blouse", price: 70, category: "Women", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/000000/ffffff?text=Silk+Blouse" },
      { name: "Leather Skirt", description: "Faux leather mini skirt", price: 45, category: "Women", sizes: ["S", "M"], image: "https://placehold.co/400x500/333333/ffffff?text=Leather+Skirt" },
      { name: "Wool Scarf", description: "Soft red wool scarf", price: 25, category: "Women", sizes: ["One Size"], image: "https://placehold.co/400x500/8b0000/ffffff?text=Scarf" },
      { name: "Ankle Boots", description: "Stylish brown ankle boots", price: 85, category: "Women", sizes: ["6", "7", "8"], image: "https://placehold.co/400x500/a0522d/ffffff?text=Boots" },
      // KIDS
      { name: "Dino T-Shirt", description: "Fun green t-shirt", price: 18, category: "Kids", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/90ee90/333333?text=Dino+Tee" },
      { name: "Kids Puffer Jacket", description: "Warm yellow puffer jacket", price: 45, category: "Kids", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/ffd700/333333?text=Puffer+Jacket" },
      { name: "Denim Overalls", description: "Durable denim overalls", price: 35, category: "Kids", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/1e90ff/ffffff?text=Overalls" },
      { name: "Rainbow Leggings", description: "Colorful leggings", price: 22, category: "Kids", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/dda0dd/333333?text=Leggings" },
      { name: "School Backpack", description: "Sturdy blue backpack", price: 30, category: "Kids", sizes: ["One Size"], image: "https://placehold.co/400x500/000080/ffffff?text=Backpack" },
      { name: "Kids Sneakers", description: "Velcro sneakers", price: 40, category: "Kids", sizes: ["10", "11", "12", "1"], image: "https://placehold.co/400x500/ff4500/ffffff?text=Sneakers" },
      { name: "Striped Polo", description: "Classic striped polo shirt", price: 25, category: "Kids", sizes: ["S", "M", "L"], image: "https://placehold.co/400x500/ff6347/ffffff?text=Polo" }
  ];
  await Product.insertMany(data);
  res.send("Database Populated! Refresh your frontend.");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));