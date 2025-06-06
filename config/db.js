const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connections[0].readyState) {
        console.log('MongoDB already connected.');
        return;
    }

    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        console.log(`Using MONGO_URI: ${process.env.MONGO_URI ? 'Set (details hidden)' : 'NOT SET!'}`); 

    

        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host} on database: ${conn.connection.name}`);
        
        mongoose.connection.on('connected', () => {
            console.log('Mongoose re-connected to DB.');
        });

        mongoose.connection.on('error', (err) => {
            console.error(`Mongoose connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('Mongoose disconnected from DB.');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('Mongoose reconnected to DB.');
        });

        mongoose.connection.on('close', () => {
            console.log('Mongoose connection closed.');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('Mongoose connection disconnected through app termination (SIGINT)');
            process.exit(0);
        });


    } catch (error) {
        console.error(`Initial MongoDB Connection Error: ${error.message}`);
        console.error('Full error object during initial connection:', error);
        if (error.reason) console.error('Reason for connection failure:', error.reason);
        process.exit(1); 
    }
};

module.exports = connectDB;
