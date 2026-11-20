
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./modules/auth/auth.routes');
const tenantRoutes = require('./modules/tenants/tenant.routes');
const userRoutes = require('./modules/users/user.routes');
const clientRoutes = require('./modules/clients/client.routes');
const paymentRoutes = require('./modules/payments/payment.routes')
const collectionRoutes = require('./modules/collection/collection.routes');
const aiRoutes = require('./modules/ai/chatbot.routes');
const messageRoutes = require("./modules/messaging/message.routes");
const posRoutes = require("./modules/pos/pos.routes");
const verificationRoutes = require('./modules/verification/verification.routes');

// NUEVO: Importar rutas de deudas
const debtRoutes = require('./modules/debts/debt.routes');

const activityRoutes = require('./modules/activities/activity.routes');
const opportunityRoutes = require('./modules/opportunities/opportunity.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const quoteRoutes = require('./modules/quotes/quote.routes');
const campaignRoutes = require('./modules/campaigns/campaign.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de FinCRM
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/ai', aiRoutes);
app.use("/api/messaging", messageRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/verification", verificationRoutes);

// Verificar funcionamiento del servidor
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'El servidor de backend si funciona'
  });
});

module.exports = app;
