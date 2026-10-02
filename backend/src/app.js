const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const issueRoutes = require('./routes/issues.routes');
const actionRoutes = require('./routes/actions.routes');
const auditRoutes = require('./routes/audits.routes');
const notificationRoutes = require('./routes/notifications.routes');

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Origin göndermeyen istemciler (curl, mobil uygulama) engellenmez.
      if (!origin || config.CORS_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error('CORS politikası tarafından engellendi: ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(config.UPLOADS_DIR, { maxAge: '7d' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
