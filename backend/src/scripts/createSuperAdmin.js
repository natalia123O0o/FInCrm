
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../modules/users/user.model');

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'superadmin@fincrm.com';
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(
        'Configura SEED_ADMIN_PASSWORD con mínimo 12 caracteres'
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('El usuario ya existe');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name: 'Administrador FinCRM',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      tenantId: null,
      isActive: true
    });

    console.log('Superadministrador creado correctamente');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();
