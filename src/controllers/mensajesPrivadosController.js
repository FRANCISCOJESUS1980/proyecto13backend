const User = require('../models/User')
const { enviarEmail } = require('../utils/emailService')
const MensajePrivado = require('../models/MensajePrivado')
const Conversacion = require('../models/Conversacion')
const mongoose = require('mongoose')

exports.obtenerConversaciones = async (req, res) => {
  try {
    const userId = req.user._id

    const conversaciones = await Conversacion.find({
      $or: [{ usuario: userId }, { admin: userId }]
    })
      .populate('usuario', 'nombre email avatar imagen rol')
      .populate('admin', 'nombre email avatar imagen rol')
      .sort({ ultimaActualizacion: -1 })

    const conversacionesFormateadas = conversaciones.map((conv) => {
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

exports.obtenerMensajesConversacion = async (req, res) => {
  try {
    const userId = req.user._id
    const { conversacionId } = req.params

    console.log('Obteniendo mensajes para conversación ID:', conversacionId)

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

    const mensajes = await MensajePrivado.find({ conversacion: conversacionId })
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')
      .sort({ fecha: 1 })

    res.status(200).json({
      success: true,
      data: mensajes,
      conversacion: conversacion
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

exports.obtenerConversacionUsuario = async (req, res) => {
  try {
    const userId = req.user._id
    const { usuarioId } = req.params

    console.log('Obteniendo conversación para usuario ID:', usuarioId)

    const otroUsuario = await User.findById(usuarioId)
    if (!otroUsuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        data: []
      })
    }

    let usuarioConvId, adminId
    if (
      req.user.rol === 'admin' ||
      req.user.rol === 'creador' ||
      req.user.rol === 'monitor'
    ) {
      adminId = userId
      usuarioConvId = usuarioId
    } else {
      adminId = usuarioId
      usuarioConvId = userId
    }

    let conversacion = await Conversacion.findOne({
      $or: [
        { usuario: usuarioConvId, admin: adminId },
        { usuario: adminId, admin: usuarioConvId }
      ]
    })
      .populate('usuario', 'nombre email avatar imagen rol')
      .populate('admin', 'nombre email avatar imagen rol')

    if (!conversacion) {
      conversacion = new Conversacion({
        usuario: usuarioConvId,
        admin: adminId,
        ultimoMensaje: '',
        ultimaActualizacion: new Date(),
        mensajesNoLeidos: [
          { usuario: usuarioConvId, cantidad: 0 },
          { usuario: adminId, cantidad: 0 }
        ]
      })

      await conversacion.save()

      conversacion = await Conversacion.findById(conversacion._id)
        .populate('usuario', 'nombre email avatar imagen rol')
        .populate('admin', 'nombre email avatar imagen rol')
    }

    const mensajes = await MensajePrivado.find({
      conversacion: conversacion._id
    })
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')
      .sort({ fecha: 1 })

    res.status(200).json({
      success: true,
      data: mensajes,
      conversacion: conversacion
    })
  } catch (error) {
    console.error('Error al obtener conversación:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversación',
      error: error.message,
      data: []
    })
  }
}

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

    const destinatarioUser = await User.findById(destinatario)
    if (!destinatarioUser) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      })
    }

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

    const nuevoMensaje = new MensajePrivado({
      conversacion: conversacion._id,
      remitente: remitenteId,
      destinatario,
      mensaje,
      fecha: new Date()
    })

    await nuevoMensaje.save()

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

exports.marcarComoLeidos = async (req, res) => {
  try {
    const userId = req.user._id
    const { conversacionId } = req.params

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

exports.eliminarMensaje = async (req, res) => {
  try {
    const userId = req.user._id
    const { mensajeId } = req.params

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

exports.obtenerMensajesNoLeidos = async (req, res) => {
  try {
    const userId = req.user._id

    const conversaciones = await Conversacion.find({
      $or: [{ usuario: userId }, { admin: userId }],
      'mensajesNoLeidos.usuario': userId
    })

    let totalNoLeidos = 0
    conversaciones.forEach((conv) => {
      const mensajesNoLeidos = conv.mensajesNoLeidos.find(
        (item) => item.usuario.toString() === userId.toString()
      )
      if (mensajesNoLeidos) {
        totalNoLeidos += mensajesNoLeidos.cantidad
      }
    })

    res.status(200).json({
      success: true,
      cantidad: totalNoLeidos
    })
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes no leídos',
      error: error.message,
      cantidad: 0
    })
  }
}

exports.actualizarMensaje = async (req, res) => {
  try {
    const userId = req.user._id
    const { mensajeId } = req.params
    const { mensaje } = req.body

    console.log('Solicitud de actualización recibida:')
    console.log('- ID del mensaje:', mensajeId)
    console.log('- ID del usuario:', userId)
    console.log('- Nuevo texto:', mensaje)

    if (!mensaje || mensaje.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El contenido del mensaje no puede estar vacío'
      })
    }

    const mensajeExistente = await MensajePrivado.findOne({
      _id: mensajeId,
      remitente: userId
    })

    if (!mensajeExistente) {
      console.log('Mensaje no encontrado o usuario no autorizado')
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado o no tienes permiso para editarlo'
      })
    }

    console.log('Mensaje encontrado:', mensajeExistente)

    mensajeExistente.mensaje = mensaje
    mensajeExistente.editado = true
    mensajeExistente.fechaEdicion = new Date()

    await mensajeExistente.save()
    console.log('Mensaje actualizado correctamente')

    const mensajeActualizado = await MensajePrivado.findById(mensajeId)
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')

    res.status(200).json({
      success: true,
      message: 'Mensaje actualizado correctamente',
      data: mensajeActualizado
    })
  } catch (error) {
    console.error('Error al actualizar mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar mensaje',
      error: error.message
    })
  }
}
exports.enviarMensajeMasivo = async (req, res) => {
  try {
    const { asunto, mensaje, enviarEmail: debeEnviarEmail = true } = req.body
    const adminId = req.user._id

    if (!asunto || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'El asunto y el mensaje son obligatorios'
      })
    }

    const usuarios = await User.find({
      _id: { $ne: adminId },

      rol: { $nin: ['admin', 'creador', 'monitor'] }
    })

    if (!usuarios.length) {
      return res.status(404).json({
        success: false,
        message: 'No hay usuarios a los que enviar el mensaje'
      })
    }

    const admin = await User.findById(adminId)
    const resultados = []

    for (const usuario of usuarios) {
      let conversacion = await Conversacion.findOne({
        usuario: usuario._id,
        admin: adminId
      })

      if (!conversacion) {
        conversacion = new Conversacion({
          usuario: usuario._id,
          admin: adminId,
          ultimoMensaje:
            mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : ''),
          ultimaActualizacion: new Date(),
          mensajesNoLeidos: [
            { usuario: usuario._id, cantidad: 1 },
            { usuario: adminId, cantidad: 0 }
          ]
        })
        await conversacion.save()
      } else {
        conversacion.ultimoMensaje =
          mensaje.substring(0, 50) + (mensaje.length > 50 ? '...' : '')
        conversacion.ultimaActualizacion = new Date()

        const mensajesNoLeidos = conversacion.mensajesNoLeidos.find(
          (item) => item.usuario.toString() === usuario._id.toString()
        )

        if (mensajesNoLeidos) {
          mensajesNoLeidos.cantidad += 1
        } else {
          conversacion.mensajesNoLeidos.push({
            usuario: usuario._id,
            cantidad: 1
          })
        }

        await conversacion.save()
      }

      const nuevoMensaje = new MensajePrivado({
        conversacion: conversacion._id,
        remitente: adminId,
        destinatario: usuario._id,
        mensaje: `${asunto}\n\n${mensaje}`,
        fecha: new Date()
      })

      await nuevoMensaje.save()
      resultados.push(nuevoMensaje)
    }

    res.status(200).json({
      success: true,
      message: `Mensaje enviado a ${usuarios.length} usuarios. Los emails se enviarán en segundo plano.`,
      data: resultados
    })

    if (debeEnviarEmail) {
      const enviarEmailsEnSegundoPlano = async () => {
        const emailsEnviados = []
        const emailsFallidos = []

        console.log(
          `Iniciando envío de emails en segundo plano a ${usuarios.length} usuarios`
        )

        const BATCH_SIZE = 3

        for (let i = 0; i < usuarios.length; i += BATCH_SIZE) {
          const loteUsuarios = usuarios.slice(i, i + BATCH_SIZE)

          const promesas = loteUsuarios.map(async (usuario) => {
            if (!usuario.email) return null

            console.log(`Intentando enviar email a: ${usuario.email}`)

            try {
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Timeout al enviar email')),
                  15000
                )
              )

              const emailPromise = enviarEmail({
                destinatario: usuario.email,
                asunto: `Nuevo mensaje de ${admin.nombre}: ${asunto}`,
                contenido: `
                  <h2>Hola ${usuario.nombre},</h2>
                  <p>Has recibido un nuevo mensaje de <strong>${
                    admin.nombre
                  }</strong> en AderCrossFit.</p>
                  <h3>Asunto: ${asunto}</h3>
                  <div style="padding: 15px; background-color: #f5f5f5; border-left: 4px solid #ff5722; margin: 15px 0;">
                    ${mensaje.replace(/\n/g, '<br>')}
                  </div>
                  <p>Inicia sesión en la aplicación para ver todos tus mensajes.</p>
                  <a href="${
                    process.env.FRONTEND_URL || 'https://adercrossfit.com'
                  }/dashboard/mensajes" 
                     style="display: inline-block; background-color: #ff5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
                    Ver mis mensajes
                  </a>
                  <p style="margin-top: 20px; font-size: 12px; color: #666;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                `
              })

              await Promise.race([emailPromise, timeoutPromise])

              console.log(`Email enviado correctamente a: ${usuario.email}`)
              emailsEnviados.push(usuario.email)
              return { success: true, email: usuario.email }
            } catch (emailError) {
              console.error(
                `No se pudo enviar email a ${usuario.email}: ${emailError.message}`
              )
              emailsFallidos.push({
                email: usuario.email,
                error: emailError.message || 'Error en el envío'
              })
              return {
                success: false,
                email: usuario.email,
                error: emailError.message
              }
            }
          })

          await Promise.allSettled(promesas)

          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        console.log(`Proceso de envío de emails completado:`)
        console.log(`- Emails enviados: ${emailsEnviados.length}`)
        console.log(`- Emails fallidos: ${emailsFallidos.length}`)
      }

      enviarEmailsEnSegundoPlano().catch((error) => {
        console.error(
          'Error en el proceso de envío de emails en segundo plano:',
          error
        )
      })
    }
  } catch (error) {
    console.error('Error al enviar mensaje masivo:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje masivo',
      error: error.message
    })
  }
}
exports.enviarMensaje = async (req, res) => {
  try {
    const remitenteId = req.user._id
    const {
      destinatario,
      mensaje,
      enviarEmail: debeEnviarEmail = true
    } = req.body

    if (!destinatario || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere destinatario y mensaje'
      })
    }

    const destinatarioUser = await User.findById(destinatario)
    if (!destinatarioUser) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      })
    }

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

    const nuevoMensaje = new MensajePrivado({
      conversacion: conversacion._id,
      remitente: remitenteId,
      destinatario,
      mensaje,
      fecha: new Date()
    })

    await nuevoMensaje.save()

    const mensajeCompleto = await MensajePrivado.findById(nuevoMensaje._id)
      .populate('remitente', 'nombre email avatar imagen rol')
      .populate('destinatario', 'nombre email avatar imagen rol')

    const respuesta = {
      success: true,
      message: 'Mensaje enviado correctamente',
      data: mensajeCompleto
    }

    res.status(201).json(respuesta)

    if (debeEnviarEmail && destinatarioUser.email) {
      const remitente = await User.findById(remitenteId)

      const enviarEmailEnSegundoPlano = async () => {
        try {
          console.log(`Intentando enviar email a: ${destinatarioUser.email}`)

          const emailPromise = enviarEmail({
            destinatario: destinatarioUser.email,
            asunto: `Nuevo mensaje de ${remitente.nombre}`,
            contenido: `
              <h2>Hola ${destinatarioUser.nombre},</h2>
              <p>Has recibido un nuevo mensaje de <strong>${
                remitente.nombre
              }</strong> en AderCrossFit.</p>
              <div style="padding: 15px; background-color: #f5f5f5; border-left: 4px solid #ff5722; margin: 15px 0;">
                ${mensaje.replace(/\n/g, '<br>')}
              </div>
              <p>Inicia sesión en la aplicación para ver todos tus mensajes y responder.</p>
              <a href="${
                process.env.FRONTEND_URL || 'https://adercrossfit.com'
              }/dashboard/mensajes" style="display: inline-block; background-color: #ff5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Ver mis mensajes</a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">Este es un mensaje automático, por favor no respondas a este correo.</p>
            `
          })

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout al enviar email')),
              10000
            )
          )

          const result = await Promise.race([emailPromise, timeoutPromise])

          if (result && result.success) {
            console.log(
              `Email enviado correctamente a: ${destinatarioUser.email}`
            )
          } else {
            console.warn(
              `No se pudo enviar email a ${destinatarioUser.email}: ${
                result?.error || 'Error desconocido'
              }`
            )
          }
        } catch (emailError) {
          console.error(
            `Error al enviar email a ${destinatarioUser.email}:`,
            emailError
          )
        }
      }

      enviarEmailEnSegundoPlano().catch((error) => {
        console.error(
          'Error en el proceso de envío de email en segundo plano:',
          error
        )
      })
    }
  } catch (error) {
    console.error('Error al enviar mensaje:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    })
  }
}
