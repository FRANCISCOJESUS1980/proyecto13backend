const Consentimiento = require('../models/Consentimiento')
const User = require('../models/User')

exports.crearConsentimiento = async (req, res) => {
  try {
    console.log('Datos recibidos en crearConsentimiento:', req.body)
    const {
      userId,
      nombreCompleto,
      dni,
      firmaDigital,
      aceptado,
      autorizaImagen,
      fechaAceptacion
    } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'El userId es requerido'
      })
    }

    if (!nombreCompleto || !nombreCompleto.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre completo es requerido'
      })
    }

    if (!dni || !dni.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El DNI es requerido'
      })
    }

    if (!firmaDigital) {
      return res.status(400).json({
        success: false,
        message: 'La firma digital es requerida'
      })
    }

    const dniRegex = /^[0-9]{8}[A-Z]$/
    if (!dniRegex.test(dni.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message:
          'El formato del DNI no es válido (debe ser 8 números seguidos de una letra)'
      })
    }

    const usuarioExiste = await User.findById(userId)
    if (!usuarioExiste) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    let consentimiento = await Consentimiento.findOne({ userId })

    if (consentimiento) {
      consentimiento.nombreCompleto = nombreCompleto.trim()
      consentimiento.dni = dni.toUpperCase().trim()
      consentimiento.firmaDigital = firmaDigital
      consentimiento.aceptado = aceptado
      consentimiento.autorizaImagen = autorizaImagen
      consentimiento.fechaAceptacion = fechaAceptacion || Date.now()
      await consentimiento.save()
    } else {
      consentimiento = new Consentimiento({
        userId,
        nombreCompleto: nombreCompleto.trim(),
        dni: dni.toUpperCase().trim(),
        firmaDigital,
        aceptado,
        autorizaImagen,
        fechaAceptacion: fechaAceptacion || Date.now()
      })
      await consentimiento.save()
    }

    res.status(201).json({
      success: true,
      data: consentimiento
    })
  } catch (error) {
    console.error('Error al crear/actualizar consentimiento:', error)
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    })
  }
}

exports.obtenerConsentimientos = async (req, res) => {
  try {
    const consentimientos = await Consentimiento.find()
      .populate('userId', 'nombre apellidos email')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: consentimientos.length,
      data: consentimientos
    })
  } catch (error) {
    console.error('Error al obtener consentimientos:', error)
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    })
  }
}

exports.obtenerConsentimientoPorUsuario = async (req, res) => {
  try {
    const { userId } = req.params

    const consentimiento = await Consentimiento.findOne({ userId }).populate(
      'userId',
      'nombre apellidos email'
    )

    if (!consentimiento) {
      return res.status(404).json({
        success: false,
        message: 'Consentimiento no encontrado para este usuario'
      })
    }

    res.status(200).json({
      success: true,
      data: consentimiento
    })
  } catch (error) {
    console.error('Error al obtener consentimiento por usuario:', error)
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    })
  }
}

exports.eliminarConsentimiento = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Solicitud para eliminar consentimiento con ID: ${id}`)

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID del consentimiento es requerido'
      })
    }

    const consentimiento = await Consentimiento.findById(id)
    if (!consentimiento) {
      return res.status(404).json({
        success: false,
        message: 'Consentimiento no encontrado'
      })
    }

    await Consentimiento.findByIdAndDelete(id)
    console.log(`Consentimiento con ID ${id} eliminado correctamente`)

    res.status(200).json({
      success: true,
      message: 'Consentimiento eliminado correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar consentimiento:', error)
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    })
  }
}

exports.verificarConsentimiento = async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del usuario es requerido'
      })
    }

    const consentimiento = await Consentimiento.findOne({ userId }).populate(
      'userId',
      'nombre apellidos email'
    )

    res.status(200).json({
      success: true,
      consentimientoFirmado: !!consentimiento,
      consentimiento: consentimiento || null
    })
  } catch (error) {
    console.error('Error al verificar consentimiento:', error)
    res.status(500).json({
      success: false,
      message: 'Error al verificar el consentimiento',
      error: error.message
    })
  }
}
