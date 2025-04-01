const Consentimiento = require('../models/Consentimiento')
const User = require('../models/User')

exports.crearConsentimiento = async (req, res) => {
  try {
    console.log('Datos recibidos en crearConsentimiento:', req.body)

    const { userId, aceptado, autorizaImagen, fechaAceptacion } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'El userId es requerido'
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
      consentimiento.aceptado = aceptado
      consentimiento.autorizaImagen = autorizaImagen
      consentimiento.fechaAceptacion = fechaAceptacion || Date.now()
      await consentimiento.save()
    } else {
      consentimiento = new Consentimiento({
        userId,
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
    const consentimientos = await Consentimiento.find().sort({ createdAt: -1 })
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
    const consentimiento = await Consentimiento.findOne({ userId })

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
