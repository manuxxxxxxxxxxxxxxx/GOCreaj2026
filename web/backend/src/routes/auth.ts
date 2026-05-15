import { Router } from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  register,
  login,
  googleCallback,
  verifyEmail,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/authController';

const router = Router();

/* ── Validators ─────────────────────────────────────────────── */
const registerValidators = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre requerido (2-100 chars)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña mínimo 6 caracteres'),
  body('role')
    .isIn(['buyer', 'seller', 'driver'])
    .withMessage('Rol inválido'),
  body('termsAccepted')
    .equals('true')
    .withMessage('Debes aceptar los Términos y Condiciones'),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

/* ── Routes ─────────────────────────────────────────────────── */
router.post('/register', registerValidators, validate, register);

router.post('/login', loginValidators, validate, login);

router.post(
  '/refresh',
  body('refreshToken').notEmpty(),
  validate,
  refreshToken,
);

router.post('/logout', authenticate, logout);

router.get('/verify/:token', verifyEmail);

router.post(
  '/forgot-password',
  body('email').isEmail(),
  validate,
  forgotPassword,
);

router.post(
  '/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  validate,
  resetPassword,
);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback,
);

export default router;
