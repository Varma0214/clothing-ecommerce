const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  sizes: [{ type: String }],
  image: { type: String, required: true },
});

module.exports = mongoose.model('Product', productSchema);