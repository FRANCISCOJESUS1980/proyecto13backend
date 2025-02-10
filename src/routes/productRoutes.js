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

router.get('/', getProducts)
router.get('/search', searchProducts)
router.get('/categoria/:categoria', getProductsByCategory)
router.get('/:id', validateProductId, getProductById)

router.use(protect)

router.post('/', authorize('admin', 'creador'), createProduct)

router.put(
  '/:id',
  validateProductId,
  authorize('admin', 'creador'),
  updateProduct
)

router.delete(
  '/:id',
  validateProductId,
  authorize('admin', 'creador'),
  deleteProduct
)

router.patch(
  '/:id/estado',
  validateProductId,
  authorize('admin', 'creador'),
  toggleProductStatus
)

module.exports = router
