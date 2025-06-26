const User = require('../models/User')

exports.añadirSesionesLibres = async (req, res) => {
  try {
    const { userId } = req.params
    const { cantidad, motivo, detalles } = req.body

    console.log('=== AÑADIR SESIONES LIBRES ===')
    console.log('userId:', userId)
    console.log('cantidad:', cantidad)
    console.log('motivo:', motivo)
    console.log('administrador:', req.user._id)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      })
    }

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número positivo'
      })
    }

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo es requerido'
      })
    }

    const usuario = await User.findById(userId)
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (usuario.estado !== 'activo') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden añadir sesiones a un usuario inactivo'
      })
    }

    const nuevasSesiones = await usuario.añadirSesionesLibres(
      Number.parseInt(cantidad),
      motivo,
      req.user._id,
      detalles || ''
    )

    console.log(
      `${cantidad} sesiones libres añadidas a ${usuario.nombre}. Total: ${nuevasSesiones}`
    )

    res.status(200).json({
      success: true,
      message: `${cantidad} sesiones libres añadidas exitosamente`,
      data: {
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          email: usuario.email
        },
        sesionesLibres: nuevasSesiones,
        sesionesAñadidas: cantidad
      }
    })
  } catch (error) {
    console.error('Error al añadir sesiones libres:', error)
    res.status(500).json({
      success: false,
      message: 'Error al añadir sesiones libres',
      error: error.message
    })
  }
}

exports.obtenerSesionesLibres = async (req, res) => {
  try {
    const { userId } = req.params

    const usuario = await User.findById(userId)
      .select(
        'nombre apellidos email sesionesLibres historialSesionesLibres estado'
      )
      .populate('historialSesionesLibres.administrador', 'nombre apellidos')

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const resumen = await usuario.obtenerResumenSesiones()

    res.status(200).json({
      success: true,
      data: {
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          email: usuario.email,
          estado: usuario.estado
        },
        sesionesLibres: usuario.sesionesLibres,
        historial: usuario.historialSesionesLibres,
        resumenCompleto: resumen
      }
    })
  } catch (error) {
    console.error('Error al obtener sesiones libres:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones libres',
      error: error.message
    })
  }
}

exports.obtenerMisSesiones = async (req, res) => {
  try {
    const usuario = await User.findById(req.user._id)

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const resumen = await usuario.obtenerResumenSesiones()
    const puedeReservar = await usuario.puedeReservarClase()

    res.status(200).json({
      success: true,
      data: {
        resumen,
        puedeReservar,
        sesionesLibres: usuario.sesionesLibres
      }
    })
  } catch (error) {
    console.error('Error al obtener mis sesiones:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de sesiones',
      error: error.message
    })
  }
}

exports.quitarSesionesLibres = async (req, res) => {
  try {
    const { userId } = req.params
    const { cantidad, motivo } = req.body

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número positivo'
      })
    }

    const usuario = await User.findById(userId)
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (usuario.sesionesLibres < cantidad) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene suficientes sesiones libres'
      })
    }

    const nuevasSesiones = await usuario.quitarSesionesLibres(
      Number.parseInt(cantidad),
      motivo || 'Removido por administrador',
      req.user._id
    )

    res.status(200).json({
      success: true,
      message: `${cantidad} sesiones libres removidas exitosamente`,
      data: {
        sesionesLibres: nuevasSesiones
      }
    })
  } catch (error) {
    console.error('Error al quitar sesiones libres:', error)
    res.status(500).json({
      success: false,
      message: 'Error al quitar sesiones libres',
      error: error.message
    })
  }
}

exports.obtenerEstadisticasSesionesLibres = async (req, res) => {
  try {
    const estadisticas = await User.aggregate([
      {
        $match: { estado: 'activo' }
      },
      {
        $group: {
          _id: null,
          totalUsuarios: { $sum: 1 },
          usuariosConSesionesLibres: {
            $sum: { $cond: [{ $gt: ['$sesionesLibres', 0] }, 1, 0] }
          },
          totalSesionesLibres: { $sum: '$sesionesLibres' },
          promedioSesionesLibres: { $avg: '$sesionesLibres' }
        }
      }
    ])

    const usuariosConMasSesiones = await User.find({
      sesionesLibres: { $gt: 0 },
      estado: 'activo'
    })
      .select('nombre apellidos email sesionesLibres')
      .sort({ sesionesLibres: -1 })
      .limit(10)

    res.status(200).json({
      success: true,
      data: {
        estadisticas: estadisticas[0] || {},
        usuariosConMasSesiones
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
