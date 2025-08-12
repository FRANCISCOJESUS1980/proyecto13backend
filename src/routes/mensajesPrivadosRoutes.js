const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const { verificarPermisosAdmin } = require('../middlewares/adminMiddleware')
const {
  obtenerConversaciones,
  obtenerMensajesConversacion,
  obtenerConversacionUsuario,
  enviarMensaje,
  marcarComoLeidos,
  eliminarMensaje,
  obtenerMensajesNoLeidos,
  actualizarMensaje,
  enviarMensajeMasivo,
  verificarConfiguracionEmail,
  enviarEmailPrueba
} = require('../controllers/mensajesPrivadosController')

router.get(
  '/verificar-email',
  protect,
  verificarPermisosAdmin,
  verificarConfiguracionEmail
)
router.post('/test-email', protect, verificarPermisosAdmin, enviarEmailPrueba)

router.get('/', protect, obtenerConversaciones)
router.get(
  '/conversacion/:conversacionId',
  protect,
  obtenerMensajesConversacion
)
router.get('/usuario/:usuarioId', protect, obtenerConversacionUsuario)
router.get('/no-leidos', protect, obtenerMensajesNoLeidos)
router.post('/', protect, enviarMensaje)
router.put('/marcar-leidos/:conversacionId', protect, marcarComoLeidos)
router.put('/:mensajeId', protect, actualizarMensaje)
router.delete('/:mensajeId', protect, eliminarMensaje)

router.post('/masivo', protect, verificarPermisosAdmin, enviarMensajeMasivo)

module.exports = router
