const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  leadId: String,
  notes: String,
  status: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Call', callSchema);