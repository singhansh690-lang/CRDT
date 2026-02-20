const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    nodeId: { type: String, required: true, unique: true },
    state: { type: Object, default: {} }, // Use Object to store the full JSON dump
    lastUpdated: { type: Date, default: Date.now }
});

const StateModel = mongoose.model('CRDTState', stateSchema);

async function connectDB(uri = 'mongodb://127.0.0.1:27017/crdt-store') {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

module.exports = { StateModel, connectDB };
