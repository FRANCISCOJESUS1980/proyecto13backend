const User = require('../models/User')
const MensajePrivado = require('../models/MensajePrivado')
const Conversacion = require('../models/Conversacion')

// Obtener todas las conversaciones del usuario actual
exports.obtenerConversaciones = async (req, res) => {
  try {
    const userId = req.user._id

    // Buscar conversaciones donde el usuario es participante
    const conversaciones = await Conversacion.find({
      $or: [{ usuario: userId }, { admin: userId }]
    })
      .populate('usuario', 'nombre email avatar imagen rol')
      .populate('admin', 'nombre email avatar imagen rol')
      .sort({ ultimaActualizacion: -1 })

    // Formatear las conversaciones para la respuesta
    const conversacionesFormateadas = conversaciones.map((conv) => {
      // Determinar si hay mensajes no leídos para el usuario actual
      const tieneNoLeidos = conv.mensajesNoLeidos.some(
        (item) =>
          item.usuario.toString() === userId.toString() && item.cantidad > 0
      )

      return {
        _id: conv._id,
        usuario: conv.usuario,
        admin: conv.admin,
        ultimoMensaje: conv.ultimoMensaje,
        ultimaActualizacion: conv.ultimaActualizacion,
        tieneNoLeidos
      }
    })

    res.status(200).json({
      success: true,
      data: conversacionesFormateadas
    })
  } catch (error) {
    console.error('Error al obtener conversaciones:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones',
      error: error.message
    })
  }
}

// Modificar la función obtenerMensajesConversacion para manejar mejor los parámetros
exports.obtenerMensajesConversacion = async (req, res) => {
  try {
    const userId = req.user._id
    const { conversacionId } = req.params

    // Verificar que el conversacionId es válido
    if (!conversacionId || conversacionId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'ID de conversación no válido',
        data: []
      })
    }

    // Verificar que la conversación existe y el usuario es participante
    const conversacion = await Conversacion.findOne({
      _id: conversacionId,
      $or: [{ usuario: userId }, { admin: userId }]
    })

    if (!conversacion) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada o no tienes acceso',
        data: []
      })
    }

    // Obtener mensajes de la conversación
    const mensajes = await MensajePrivado.find({ conversacion: conversacionId })
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')
      .sort({ fecha: 1 })

    res.status(200).json({
      success: true,
      data: mensajes
    })
  } catch (error) {
    console.error('Error al obtener mensajes:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes',
      error: error.message,
      data: []
    })
  }
}

// Enviar un mensaje privado
exports.enviarMensaje = async (req, res) => {
  try {
    const remitenteId = req.user._id
    const { destinatario, mensaje } = req.body

    if (!destinatario || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere destinatario y mensaje'
      })
    }

    // Verificar que el destinatario existe
    const destinatarioUser = await User.findById(destinatario)
    if (!destinatarioUser) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      })
    }

    // Determinar quién es el usuario y quién es el admin
    let usuarioId, adminId
    if (
      req.user.rol === 'admin' ||
      req.user.rol === 'creador' ||
      req.user.rol === 'monitor'
    ) {
      adminId = remitenteId
      usuarioId = destinatario
    } else {
      adminId = destinatario
      usuarioId = remitenteId
    }

    // Buscar o crear conversación
    let conversacion = await Conversacion.findOne({
      $or: [
        { usuario: usuarioId, admin: adminId },
        { usuario: adminId, admin: usuarioId }
      ]
    })

    if (!conversacion) {
      conversacion = new Conversacion({
        usuario: usuarioId,
        admin: adminId,
        ultimoMensaje: mensaje,
        ultimaActualizacion: new Date(),
        mensajesNoLeidos: [
          { usuario: usuarioId, cantidad: 0 },
          { usuario: adminId, cantidad: 0 }
        ]
      })
    } else {
      conversacion.ultimoMensaje = mensaje
      conversacion.ultimaActualizacion = new Date()
    }

    // Incrementar contador de mensajes no leídos para el destinatario
    const mensajesNoLeidos = conversacion.mensajesNoLeidos.find(
      (item) => item.usuario.toString() === destinatario.toString()
    )
    if (mensajesNoLeidos) {
      mensajesNoLeidos.cantidad += 1
    } else {
      conversacion.mensajesNoLeidos.push({
        usuario: destinatario,
        cantidad: 1
      })
    }

    await conversacion.save()

    // Crear el mensaje
    const nuevoMensaje = new MensajePrivado({
      conversacion: conversacion._id,
      remitente: remitenteId,
      destinatario,
      mensaje,
      fecha: new Date()
    })

    await nuevoMensaje.save()

    // Poblar los datos del remitente y destinatario para la respuesta
    const mensajeCompleto = await MensajePrivado.findById(nuevoMensaje._id)
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: mensajeCompleto
    })
  } catch (error) {
    console.error('Error al enviar mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    })
  }
}

// Marcar mensajes como leídos
exports.marcarComoLeidos = async (req, res) => {
  try {
    const userId = req.user._id
    const { conversacionId } = req.params

    // Verificar que la conversación existe y el usuario es participante
    const conversacion = await Conversacion.findOne({
      _id: conversacionId,
      $or: [{ usuario: userId }, { admin: userId }]
    })

    if (!conversacion) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada o no tienes acceso'
      })
    }

    // Resetear contador de mensajes no leídos para el usuario actual
    const mensajesNoLeidos = conversacion.mensajesNoLeidos.find(
      (item) => item.usuario.toString() === userId.toString()
    )
    if (mensajesNoLeidos) {
      mensajesNoLeidos.cantidad = 0
      await conversacion.save()
    }

    res.status(200).json({
      success: true,
      message: 'Mensajes marcados como leídos'
    })
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error)
    res.status(500).json({
      success: false,
      message: 'Error al marcar mensajes como leídos',
      error: error.message
    })
  }
}

// Eliminar un mensaje
exports.eliminarMensaje = async (req, res) => {
  try {
    const userId = req.user._id
    const { mensajeId } = req.params

    // Verificar que el mensaje existe y el usuario es el remitente
    const mensaje = await MensajePrivado.findOne({
      _id: mensajeId,
      remitente: userId
    })

    if (!mensaje) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado o no tienes permiso para eliminarlo'
      })
    }

    // Eliminar el mensaje
    await MensajePrivado.deleteOne({ _id: mensajeId })

    res.status(200).json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar mensaje',
      error: error.message
    })
  }
}
