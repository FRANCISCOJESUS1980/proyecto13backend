const Bono = require('../models/Bono')
const User = require('../models/User')

const verificarYActualizarBono = async (bono) => {
  if (!bono || typeof bono.actualizarEstado !== 'function') {
    return bono
  }

  try {
    await bono.actualizarEstado()
    return bono
  } catch (error) {
    console.error('Error al actualizar estado del bono:', error)
    return bono
  }
}

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

    await verificarYActualizarBono(usuario.bonoActivo)

    const usuarioActualizado = await User.findById(req.user._id).populate(
      'bonoActivo'
    )

    if (
      !usuarioActualizado.bonoActivo ||
      usuarioActualizado.bonoActivo.estado === 'expirado'
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Tu bono ha expirado. Contacta con administración para renovarlo.'
      })
    }

    const bonoData = usuarioActualizado.bonoActivo.toObject()
    if (usuarioActualizado.bonoActivo.estado === 'pausado') {
      const infoPausa = usuarioActualizado.bonoActivo.obtenerInfoPausaActual()
      bonoData.infoPausa = infoPausa
    }

    res.status(200).json({
      success: true,
      data: bonoData
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

    if (usuario.bonoActivo) {
      await Bono.findByIdAndUpdate(usuario.bonoActivo, {
        estado: 'finalizado'
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
      fechaFinOriginal: new Date(fechaFin),
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      })
    }

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

    await verificarYActualizarBono(usuario.bonoActivo)

    const usuarioActualizado = await User.findById(userId).populate(
      'bonoActivo'
    )

    if (!usuarioActualizado.bonoActivo) {
      return res.status(404).json({
        success: false,
        message: 'El usuario no tiene un bono activo'
      })
    }

    const bonoData = usuarioActualizado.bonoActivo.toObject()
    if (usuarioActualizado.bonoActivo.estado === 'pausado') {
      const infoPausa = usuarioActualizado.bonoActivo.obtenerInfoPausaActual()
      bonoData.infoPausa = infoPausa
    }

    res.status(200).json({
      success: true,
      data: bonoData
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
    const { motivo, fechaPausa } = req.body

    console.log('=== PAUSAR BONO ===')
    console.log('Bono ID:', bonoId)
    console.log('Motivo:', motivo)
    console.log('Fecha pausa:', fechaPausa)

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    console.log('Estado actual del bono:', bono.estado)

    if (bono.estado === 'pausado') {
      return res.status(400).json({
        success: false,
        message: 'El bono ya está pausado'
      })
    }

    if (bono.estado === 'finalizado' || bono.estado === 'expirado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede pausar un bono finalizado o expirado'
      })
    }

    const fechaPausaDate = fechaPausa ? new Date(fechaPausa) : new Date()

    bono.estado = 'pausado'
    bono.motivoPausa = motivo
    bono.fechaPausa = fechaPausaDate

    if (!bono.historialPausas) {
      bono.historialPausas = []
    }

    bono.historialPausas.push({
      fechaInicio: fechaPausaDate,
      motivo
    })

    await bono.save()

    console.log(`Bono ${bonoId} pausado exitosamente`)

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
    const { diasExtension, fechaReactivacion } = req.body

    console.log('=== REACTIVAR BONO ===')
    console.log('Bono ID:', bonoId)
    console.log('Días extensión:', diasExtension)
    console.log('Fecha reactivación:', fechaReactivacion)

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    console.log('Estado actual del bono:', bono.estado)
    console.log('Fecha pausa:', bono.fechaPausa)
    console.log('Motivo pausa:', bono.motivoPausa)

    if (bono.estado !== 'pausado') {
      return res.status(400).json({
        success: false,
        message: `El bono no está pausado. Estado actual: ${bono.estado}`
      })
    }

    const fechaReactivacionDate = fechaReactivacion
      ? new Date(fechaReactivacion)
      : new Date()

    let diasCalculados = diasExtension
    if (typeof diasCalculados !== 'number' || diasCalculados < 0) {
      diasCalculados = bono.calcularDiasPausa(
        bono.fechaPausa,
        fechaReactivacionDate
      )
    }

    console.log(`Reactivando bono ${bonoId}:`)
    console.log(`- Fecha de pausa: ${bono.fechaPausa}`)
    console.log(`- Fecha de reactivación: ${fechaReactivacionDate}`)
    console.log(`- Días de extensión: ${diasCalculados}`)
    console.log(`- Fecha fin anterior: ${bono.fechaFin}`)

    if (diasCalculados > 0) {
      const nuevaFechaFin = new Date(bono.fechaFin)
      nuevaFechaFin.setDate(nuevaFechaFin.getDate() + diasCalculados)
      bono.fechaFin = nuevaFechaFin
      bono.diasTotalExtension = (bono.diasTotalExtension || 0) + diasCalculados

      console.log(`- Nueva fecha fin: ${nuevaFechaFin}`)
    }

    if (bono.historialPausas && bono.historialPausas.length > 0) {
      const pausaActual = bono.historialPausas[bono.historialPausas.length - 1]
      if (!pausaActual.fechaFin) {
        pausaActual.fechaFin = fechaReactivacionDate
        pausaActual.diasExtension = diasCalculados
      }
    }

    bono.estado = 'activo'
    bono.motivoPausa = null
    bono.fechaPausa = null

    await bono.save()

    console.log(
      `Bono ${bonoId} reactivado exitosamente con ${diasCalculados} días de extensión`
    )

    res.status(200).json({
      success: true,
      message: `Bono reactivado exitosamente. Se han añadido ${diasCalculados} días de extensión.`,
      data: {
        ...bono.toObject(),
        diasExtensionAplicados: diasCalculados
      }
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

    if (!bonoId) {
      return res.status(400).json({
        success: false,
        message: 'ID del bono es requerido'
      })
    }

    if (!sesionesAdicionales) {
      return res.status(400).json({
        success: false,
        message: 'El número de sesiones adicionales es requerido'
      })
    }

    const sesionesAñadir = Number.parseInt(sesionesAdicionales, 10)

    if (isNaN(sesionesAñadir) || sesionesAñadir <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El número de sesiones debe ser un número positivo'
      })
    }

    const bono = await Bono.findById(bonoId)

    if (!bono) {
      return res.status(404).json({
        success: false,
        message: 'Bono no encontrado'
      })
    }

    if (bono.estado === 'finalizado' || bono.estado === 'expirado') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden añadir sesiones a un bono finalizado o expirado'
      })
    }

    bono.sesionesTotal += sesionesAñadir
    bono.sesionesRestantes += sesionesAñadir

    await bono.save()

    await verificarYActualizarBono(bono)

    console.log(
      `${sesionesAñadir} sesiones añadidas exitosamente al bono ${bonoId}`
    )

    res.status(200).json({
      success: true,
      message: `${sesionesAñadir} sesiones añadidas exitosamente`,
      data: bono
    })
  } catch (error) {
    console.error('Error al añadir sesiones:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al añadir sesiones',
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

    for (const bono of usuario.historialBonos) {
      if (bono) {
        await verificarYActualizarBono(bono)
      }
    }

    const historialConInfo = usuario.historialBonos
      .filter((bono) => bono)
      .map((bono) => {
        const bonoObj = bono.toObject()

        if (bonoObj.historialPausas && bonoObj.historialPausas.length > 0) {
          bonoObj.totalDiasPausado = bonoObj.historialPausas.reduce(
            (total, pausa) => {
              return total + (pausa.diasExtension || 0)
            },
            0
          )
        }

        return bonoObj
      })

    res.status(200).json({
      success: true,
      data: historialConInfo
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

exports.obtenerTodosLosBonos = async (req, res) => {
  try {
    const bonos = await Bono.find().populate({
      path: 'usuario',
      select: 'nombre email'
    })

    console.log(`Encontrados ${bonos.length} bonos`)

    const bonosConInfo = []

    for (const bono of bonos) {
      if (bono) {
        await verificarYActualizarBono(bono)

        const bonoObj = bono.toObject()

        if (bono.estado === 'pausado') {
          const infoPausa = bono.obtenerInfoPausaActual()
          bonoObj.infoPausa = infoPausa
        }

        bonosConInfo.push(bonoObj)
      }
    }

    res.status(200).json({
      success: true,
      count: bonosConInfo.length,
      data: bonosConInfo
    })
  } catch (error) {
    console.error('Error al obtener todos los bonos:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener todos los bonos',
      error: error.message
    })
  }
}

exports.actualizarBonosExpirados = async (req, res) => {
  try {
    const bonosActualizados = await Bono.actualizarBonosExpirados()

    res.status(200).json({
      success: true,
      message: `Verificación completada. ${bonosActualizados} bonos actualizados.`,
      data: {
        bonosActualizados
      }
    })
  } catch (error) {
    console.error('Error al actualizar bonos expirados:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar bonos expirados',
      error: error.message
    })
  }
}

exports.obtenerEstadisticasBonos = async (req, res) => {
  try {
    await Bono.actualizarBonosExpirados()

    const estadisticas = await Bono.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          totalSesiones: { $sum: '$sesionesTotal' },
          sesionesRestantes: { $sum: '$sesionesRestantes' }
        }
      }
    ])

    const bonosPausados = await Bono.find({ estado: 'pausado' })
    const diasTotalPausa = bonosPausados.reduce((total, bono) => {
      const infoPausa = bono.obtenerInfoPausaActual()
      return total + (infoPausa ? infoPausa.diasPausado : 0)
    }, 0)

    res.status(200).json({
      success: true,
      data: {
        estadisticasPorEstado: estadisticas,
        bonosPausados: bonosPausados.length,
        diasTotalPausa
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    })
  }
}
