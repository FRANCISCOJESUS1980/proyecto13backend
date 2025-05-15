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
  obtenerMensajesNoLeidos,
  actualizarMensaje,
  enviarMensajeMasivo
} = require('../controllers/mensajesPrivadosController')
const {
  verificarConfiguracionEmail,
  enviarEmail
} = require('../utils/emailService')

router.get('/verificar-email', protect, async (req, res) => {
  try {
    if (!['admin', 'creador', 'monitor'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      })
    }

    const resultado = await verificarConfiguracionEmail()
    return res.status(200).json(resultado)
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al verificar configuración de email',
      error: error.message
    })
  }
})

router.post('/test-email', protect, async (req, res) => {
  try {
    if (!['admin', 'creador', 'monitor'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      })
    }

    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un email para la prueba'
      })
    }

    const resultado = await enviarEmail({
      destinatario: email,
      asunto: 'Prueba de email - AderCrossFit',
      contenido: `
        <h2>Hola ${req.user.nombre},</h2>
        <p>Este es un email de prueba del sistema de mensajería de AderCrossFit.</p>
        <p>Si estás recibiendo este mensaje, la configuración de email está funcionando correctamente.</p>
        <p>Fecha y hora de envío: ${new Date().toLocaleString()}</p>
      `
    })

    return res.status(200).json({
      success: resultado.success,
      message: resultado.success
        ? 'Email de prueba enviado correctamente'
        : 'Error al enviar email de prueba',
      details: resultado
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al enviar email de prueba',
      error: error.message
    })
  }
})

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

router.post(
  '/masivo',
  protect,
  (req, res, next) => {
    if (!req.user || !['admin', 'creador', 'monitor'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      })
    }
    next()
  },
  enviarMensajeMasivo
)

module.exports = router
