const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/authMiddleware')
const {
  crearBono,
  obtenerBonoUsuario,
  pausarBono,
  reactivarBono,
  añadirSesiones,
  obtenerHistorialBonos,
  obtenerBonoActual
} = require('../controllers/bonoController')

router.get('/me', protect, obtenerBonoActual)

router.use(protect)
router.use(authorize('admin', 'creador', 'monitor'))

router.post('/', crearBono)
router.get('/usuario/:userId', obtenerBonoUsuario)
router.get('/usuario/:userId/historial', obtenerHistorialBonos)
router.put('/:bonoId/pausar', pausarBono)
router.put('/:bonoId/reactivar', reactivarBono)

router.put('/:bonoId/agregar-sesiones', añadirSesiones)

module.exports = router
