const express = require('express')
const router = express.Router()
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  toggleProductStatus
} = require('../controllers/productController')
const { protect, authorize } = require('../middlewares/authMiddleware')
const validateProductId = require('../middlewares/validateProductId')
const upload = require('../config/multer')

router.get('/productos', getProducts)
router.get('/productos/search', searchProducts)
router.get('/productos/categoria/:categoria', getProductsByCategory)
router.get('/productos/:id', validateProductId, getProductById)

router.use(protect)

router.post(
  '/productos',
  upload.single('imagen'),
  authorize('admin', 'creador'),
  createProduct
)

router.put(
  '/productos/:id',
  validateProductId,
  upload.single('imagen'),
  authorize('admin', 'creador'),
  updateProduct
)

router.delete(
  '/productos/:id',
  validateProductId,
  authorize('admin', 'creador'),
  deleteProduct
)

router.patch(
  '/productos/:id/estado',
  validateProductId,
  authorize('admin', 'creador'),
  toggleProductStatus
)

module.exports = router
