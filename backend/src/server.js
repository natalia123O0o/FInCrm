require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { startNotificationScheduler } = require('./jobs/notificationScheduler');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    startNotificationScheduler();
    app.listen(PORT, () => {
      console.log(`Servidor en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar:', err.message);
    process.exit(1);
  }
}

start();