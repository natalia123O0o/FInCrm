
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
const planRoutes = require('./modules/plans/plan.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const protect = require('./middlewares/auth.middleware');
const { requireFeature } = require('./middlewares/feature.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de FinCRM
app.use('/api/plans', planRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/activities', protect, requireFeature('activities'), activityRoutes);
app.use('/api/notifications', protect, requireFeature('activities'), notificationRoutes);
app.use('/api/opportunities', protect, requireFeature('opportunities'), opportunityRoutes);
app.use('/api/quotes', protect, requireFeature('quotes'), quoteRoutes);
app.use('/api/campaigns', protect, requireFeature('campaigns'), campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', protect, requireFeature('crm'), clientRoutes);
app.use('/api/payments', protect, requireFeature('crm'), paymentRoutes);
app.use('/api/collection', protect, requireFeature('crm'), collectionRoutes);
app.use('/api/debts', protect, requireFeature('crm'), debtRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messaging', protect, requireFeature('messaging'), messageRoutes);
app.use('/api/pos', protect, requireFeature('pos'), posRoutes);
app.use("/api/verification", verificationRoutes);

// Verificar funcionamiento del servidor
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'El servidor de backend si funciona'
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' });
  console.error('API:', error.message);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  return res.status(status).json({ code: status === 500 ? 'INTERNAL_ERROR' : error.code,
    message: status === 500 ? 'No se pudo completar la operación.' : error.message });
});

module.exports = app;
