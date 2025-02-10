const Class = require('../models/Class')

exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find().populate('monitor', 'nombre email')
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
    const newClass = new Class({
      ...req.body,
      monitor: req.user.id
    })

    await newClass.save()

    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Clase creada exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear la clase',
      error: error.message
    })
  }
}

exports.updateClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (
      classItem.monitor.toString() !== req.user.id &&
      req.user.rol !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar esta clase'
      })
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: 'Clase actualizada exitosamente'
    })
  } catch (error) {
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
      classItem.monitor.toString() !== req.user.id &&
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
