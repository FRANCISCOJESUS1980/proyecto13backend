const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middlewares/authMiddleware')
const {
  añadirSesionesLibres,
  obtenerSesionesLibres,
  obtenerMisSesiones,
  quitarSesionesLibres,
  obtenerEstadisticasSesionesLibres
} = require('../controllers/sesionesLibresController')

router.get('/mis-sesiones', protect, obtenerMisSesiones)

router.use(protect)
router.use(authorize('admin', 'creador', 'monitor'))

router.get('/estadisticas', obtenerEstadisticasSesionesLibres)
router.get('/usuario/:userId', obtenerSesionesLibres)
router.post('/usuario/:userId/anadir', añadirSesionesLibres)
router.post('/usuario/:userId/quitar', quitarSesionesLibres)

module.exports = router
