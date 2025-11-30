const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [{
    name: String,
    qty: Number,
    image: String,
    price: Number,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    size: String
  }],
  totalPrice: { type: Number, required: true },
  isPaid: { type: Boolean, default: true },
  paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);