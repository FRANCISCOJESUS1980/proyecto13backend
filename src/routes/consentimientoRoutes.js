const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/authMiddleware')
const {
  crearConsentimiento,
  obtenerConsentimientos,
  obtenerConsentimientoPorUsuario,
  eliminarConsentimiento
} = require('../controllers/consentimientoController')

router.post('/', protect, crearConsentimiento)

router.get(
  '/',
  protect,
  authorize('administrador', 'admin', 'creador'),
  obtenerConsentimientos
)

router.get('/usuario/:userId', protect, obtenerConsentimientoPorUsuario)

router.delete(
  '/:id',
  protect,
  authorize('administrador', 'admin', 'creador'),
  eliminarConsentimiento
)

module.exports = router
