import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

const VALID_CATEGORIES = ['panaderia','alimentos','bebidas','artesanias','otros'];

/* ── Validators ───────────────────────────────────────────── */
const createValidators = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre debe tener entre 2 y 200 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede superar 2000 caracteres'),
  body('price')
    .isFloat({ min: 0.01, max: 99999.99 })
    .withMessage('El precio debe ser mayor a 0 y menor a 100 000'),
  body('stock')
    .isInt({ min: 0, max: 99999 })
    .withMessage('El stock debe ser un número entero entre 0 y 99 999'),
  body('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Categoría inválida. Opciones: ${VALID_CATEGORIES.join(', ')}`),
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Se permiten máximo 10 imágenes'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Cada imagen debe ser una URL válida'),
];

/* ── Routes ───────────────────────────────────────────────── */
router.get(
  '/',
  optionalAuth,
  listProducts,
);

router.get(
  '/:id',
  getProduct,
);

router.post(
  '/',
  authenticate,
  requireRole('seller', 'admin', 'master_admin'),
  createValidators,
  validate,
  createProduct,
);

router.patch(
  '/:id',
  authenticate,
  requireRole('seller', 'admin', 'master_admin'),
  updateProduct,
);

router.delete(
  '/:id',
  authenticate,
  requireRole('seller', 'admin', 'master_admin'),
  deleteProduct,
);

export default router;
