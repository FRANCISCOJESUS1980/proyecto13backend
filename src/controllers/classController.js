const Class = require('../models/Class')
const cloudinary = require('../config/cloudinary')
const fs = require('fs').promises

exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('monitor', 'nombre email')
      .populate('inscritos', 'nombre email')

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las clases',
      error: error.message
    })
  }
}

exports.getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('monitor', 'nombre email')
      .populate('inscritos', 'nombre email')

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: classItem
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener la clase',
      error: error.message
    })
  }
}

exports.createClass = async (req, res) => {
  try {
    console.log('Body recibido:', req.body)
    console.log('Archivo recibido:', req.file)
    console.log('Usuario:', req.user)

    let imageUrl = null

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'classes',
        width: 500,
        height: 500,
        crop: 'fill'
      })
      imageUrl = result.secure_url
      await fs.unlink(req.file.path)
    }

    let diasSemana = req.body.diasSemana
    if (typeof diasSemana === 'string') {
      try {
        diasSemana = JSON.parse(diasSemana)
      } catch (e) {
        console.error('Error al parsear diasSemana:', e)
        diasSemana = []
      }
    }

    const newClass = new Class({
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      horario: req.body.horario,
      duracion: req.body.duracion,
      capacidadMaxima: req.body.capacidadMaxima,
      categoria: req.body.categoria,
      nivel: req.body.nivel,
      ubicacion: req.body.ubicacion,
      diasSemana: diasSemana,
      monitor: req.user._id,
      imagen: imageUrl
    })

    await newClass.save()

    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Clase creada exitosamente'
    })
  } catch (error) {
    console.error('Error en createClass:', error)
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error)
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear la clase',
      error: error.message
    })
  }
}

exports.updateClass = async (req, res) => {
  try {
    let classItem = await Class.findById(req.params.id)

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (
      classItem.monitor.toString() !== req.user._id.toString() &&
      req.user.rol !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar esta clase'
      })
    }

    let imageUrl = classItem.imagen

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'classes',
        width: 500,
        height: 500,
        crop: 'fill'
      })
      imageUrl = result.secure_url
      await fs.unlink(req.file.path)
    }

    let diasSemana = req.body.diasSemana
    if (typeof diasSemana === 'string') {
      try {
        diasSemana = JSON.parse(diasSemana)
      } catch (e) {
        console.error('Error al parsear diasSemana:', e)
        diasSemana = classItem.diasSemana
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        diasSemana,
        imagen: imageUrl
      },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: 'Clase actualizada exitosamente'
    })
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error)
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la clase',
      error: error.message
    })
  }
}

exports.deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (
      classItem.monitor.toString() !== req.user._id.toString() &&
      req.user.rol !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para eliminar esta clase'
      })
    }

    await Class.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Clase eliminada exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la clase',
      error: error.message
    })
  }
}
