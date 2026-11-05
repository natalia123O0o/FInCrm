const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('Falta MONGODB_URI en el archibo .env');
    }

    await mongoose.connect(uri);
    console.log('Estamos conectados a la base de datos de MongoDB')
}

module.exports = connectDB;