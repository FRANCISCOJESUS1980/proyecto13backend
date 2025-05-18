const Bono = require('../models/Bono')
const User = require('../models/User')

exports.obtenerBonoActual = async (req, res) => {
  try {
    const usuario = await User.findById(req.user._id).populate('bonoActivo')

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (!usuario.bonoActivo) {
      return res.status(404).json({
        success: false,
        message: 'No tienes un bono activo'
      })
    }

    res.status(200).json({
      success: true,
      data: usuario.bonoActivo
    })
  } catch (error) {
    console.error('Error al obtener bono actual:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el bono actual',
      error: error.message
    })
  }
}

exports.crearBono = async (req, res) => {
  try {
    const { userId, tipo, sesionesTotal, precio, duracionMeses = 1 } = req.body

    const usuario = await User.findById(userId)
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const fechaInicio = new Date()
    const fechaFin = new Date()
    fechaFin.setMonth(fechaFin.getMonth() + duracionMeses)

    const nuevoBono = await Bono.create({
      usuario: userId,
      tipo,
      sesionesTotal,
      sesionesRestantes: sesionesTotal,
      fechaInicio,
      fechaFin,
      precio
    })

    usuario.bonoActivo = nuevoBono._id
    if (!usuario.historialBonos) {
      usuario.historialBonos = []
    }
    usuario.historialBonos.push(nuevoBono._id)
    await usuario.save()

    res.status(201).json({
      success: true,
      message: 'Bono creado exitosamente',
      data: nuevoBono
    })
  } catch (error) {
    console.error('Error al crear bono:', error)
    res.status(500).json({
      success: false,
      message: 'Error al crear el bono',
      error: error.message
    })
  }
}

exports.obtenerBonoUsuario = async (req, res) => {
  try {
    const { userId } = req.params

    const usuario = await User.findById(userId).populate('bonoActivo')

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (!usuario.bonoActivo) {
      return res.status(404).json({
        success: false,
        message: 'El usuario no tiene un bono activo'
      })
    }

    res.status(200).json({
      success: true,
      data: usuario.bonoActivo
    })
  } catch (error) {
    console.error('Error al obtener bono:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el bono',
      error: error.message
    })
  }
}

exports.pausarBono = async (req, res) => {
  try {
    const { bonoId } = req.params
    const { motivo } = req.body

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    if (bono.estado === 'pausado') {
      return res.status(400).json({
        success: false,
        message: 'El bono ya está pausado'
      })
    }

    const fechaPausa = new Date()
    bono.estado = 'pausado'
    bono.motivoPausa = motivo
    bono.fechaPausa = fechaPausa

    if (!bono.historialPausas) {
      bono.historialPausas = []
    }

    bono.historialPausas.push({
      fechaInicio: fechaPausa,
      motivo
    })

    await bono.save()

    res.status(200).json({
      success: true,
      message: 'Bono pausado exitosamente',
      data: bono
    })
  } catch (error) {
    console.error('Error al pausar bono:', error)
    res.status(500).json({
      success: false,
      message: 'Error al pausar el bono',
      error: error.message
    })
  }
}

exports.reactivarBono = async (req, res) => {
  try {
    const { bonoId } = req.params
    const { diasExtension = 0 } = req.body

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    if (bono.estado !== 'pausado') {
      return res.status(400).json({
        success: false,
        message: 'El bono no está pausado'
      })
    }

    if (diasExtension > 0) {
      const fechaFin = new Date(bono.fechaFin)
      fechaFin.setDate(fechaFin.getDate() + diasExtension)
      bono.fechaFin = fechaFin
    }

    const pausaActual = bono.historialPausas[bono.historialPausas.length - 1]
    pausaActual.fechaFin = new Date()

    bono.estado = 'activo'
    bono.motivoPausa = null
    bono.fechaPausa = null

    await bono.save()

    res.status(200).json({
      success: true,
      message: 'Bono reactivado exitosamente',
      data: bono
    })
  } catch (error) {
    console.error('Error al reactivar bono:', error)
    res.status(500).json({
      success: false,
      message: 'Error al reactivar el bono',
      error: error.message
    })
  }
}

exports.añadirSesiones = async (req, res) => {
  try {
    const { bonoId } = req.params
    const { sesionesAdicionales } = req.body

    console.log(
      'Añadiendo sesiones al bono:',
      bonoId,
      'Sesiones:',
      sesionesAdicionales
    )

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    bono.sesionesTotal += parseInt(sesionesAdicionales)
    bono.sesionesRestantes += parseInt(sesionesAdicionales)

    await bono.save()

    res.status(200).json({
      success: true,
      message: `${sesionesAdicionales} sesiones añadidas exitosamente`,
      data: bono
    })
  } catch (error) {
    console.error('Error al añadir sesiones:', error)
    res.status(500).json({
      success: false,
      message: 'Error al añadir sesiones',
      error: error.message
    })
  }
}

exports.obtenerHistorialBonos = async (req, res) => {
  try {
    const { userId } = req.params

    const usuario = await User.findById(userId).populate('historialBonos')

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (!usuario.historialBonos || usuario.historialBonos.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      })
    }

    res.status(200).json({
      success: true,
      data: usuario.historialBonos
    })
  } catch (error) {
    console.error('Error al obtener historial de bonos:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de bonos',
      error: error.message
    })
  }
}
