const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const {
  obtenerConversaciones,
  obtenerMensajesConversacion,
  obtenerConversacionUsuario,
  enviarMensaje,
  marcarComoLeidos,
  eliminarMensaje,
  obtenerMensajesNoLeidos
} = require('../controllers/mensajesPrivadosController')

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
router.delete('/:mensajeId', protect, eliminarMensaje)

module.exports = router
