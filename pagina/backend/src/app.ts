import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import './config/passport';

import authRoutes         from './routes/auth';
import userRoutes         from './routes/users';
import productRoutes      from './routes/products';
import orderRoutes        from './routes/orders';
import deliveryRoutes     from './routes/deliveries';
import analyticsRoutes    from './routes/analytics';
import notificationRoutes from './routes/notifications';
import messagesRoutes     from './routes/messages';
import categoriesRoutes   from './routes/categories';
import { errorHandler }   from './middleware/errorHandler';

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Compresión gzip (requiere: npm install compression @types/compression) ── */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compression = require('compression');
  app.use(compression());
} catch { /* paquete no instalado todavía */ }

/* ── Seguridad ── */
app.use(helmet({
  crossOriginEmbedderPolicy: false, // permite cargar recursos externos (imágenes Unsplash, etc.)
}));

/* ── CORS: acepta el frontend estático Y el servidor de desarrollo ── */
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .concat([
    'http://localhost:5500', 'http://127.0.0.1:5500',  // VS Code Live Server
    'http://localhost:8081', 'http://127.0.0.1:8081',  // Expo web
    'http://localhost:19006',                           // Expo web legacy
  ]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
}));

/* ── Rate limiting ── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max:      50,
  message:  { error: 'Demasiadas subidas de archivos. Espera un momento.' },
});

app.use('/api', globalLimiter);

/* ── Parsing ── */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ── Passport ── */
app.use(passport.initialize());

/* ── Health checks ── */
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date() }),
);
app.get('/api/v1/health', (_req, res) =>
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV, ts: new Date() }),
);

/* ── Rutas ── */
app.use('/api/v1/auth',          authLimiter,  authRoutes);
app.use('/api/v1/users',                       userRoutes);
app.use('/api/v1/products',                    productRoutes);
app.use('/api/v1/orders',                      orderRoutes);
app.use('/api/v1/deliveries',                  deliveryRoutes);
app.use('/api/v1/analytics',                   analyticsRoutes);
app.use('/api/v1/notifications',               notificationRoutes);
app.use('/api/v1/messages',                    messagesRoutes);
app.use('/api/v1/categories',                  categoriesRoutes);

/* ── 404 ── */
app.use('*', (_req, res) =>
  res.status(404).json({ error: 'Ruta no encontrada' }),
);

/* ── Error global ── */
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 LocalMarket API → http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
