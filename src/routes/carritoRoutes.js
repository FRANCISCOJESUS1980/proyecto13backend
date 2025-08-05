const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const carritoController = require('../controllers/carritoController')

router.get('/', protect, carritoController.obtenerCarrito)
router.post('/', protect, carritoController.guardarCarrito)
router.post('/producto', protect, carritoController.agregarProducto)
router.put(
  '/producto/:productId',
  protect,
  carritoController.actualizarCantidad
)
router.delete(
  '/producto/:productId',
  protect,
  carritoController.eliminarProducto
)
router.delete('/', protect, carritoController.vaciarCarrito)

module.exports = router
