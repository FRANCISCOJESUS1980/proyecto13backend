const Class = require('../models/Class')
const cloudinary = require('../config/cloudinary')
const fs = require('fs')
const ClassService = require('../services/classService')

exports.createClass = async (req, res) => {
  try {
    const classData = { ...req.body }

    if (classData.entrenador === '') delete classData.entrenador

    if (classData.fecha && classData.fecha.trim() !== '') {
      classData.esFechaEspecifica = true
    } else {
      classData.esFechaEspecifica = false
      classData.fecha = null
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'crossfit/clases'
        })
        classData.imagen = result.secure_url
        fs.unlinkSync(req.file.path)
      } catch (error) {
        console.error('Error al subir imagen a Cloudinary:', error)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    }

    const newClass = await Class.create(classData)
    res.status(201).json({
      success: true,
      message: 'Clase creada exitosamente',
      data: newClass
    })
  } catch (error) {
    console.error('Error al crear clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al crear la clase',
      error: error.message
    })
  }
}

exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate({
        path: 'inscritos',
        select: 'nombre email avatar rol',
        model: 'User'
      })
      .populate({
        path: 'entrenador',
        select: 'nombre email avatar',
        model: 'User'
      })

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    })
  } catch (error) {
    console.error('Error al obtener clases:', error)
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
      .populate('inscritos', 'nombre email imagen rol')
      .populate('entrenador', 'nombre email imagen')

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
    console.error('Error al obtener clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener la clase',
      error: error.message
    })
  }
}

exports.updateClass = async (req, res) => {
  try {
    const classData = { ...req.body }

    if (classData.entrenador === '') delete classData.entrenador

    if (classData.fecha && classData.fecha.trim() !== '') {
      classData.esFechaEspecifica = true
    } else {
      classData.esFechaEspecifica = false
      classData.fecha = null
    }

    const currentClass = await Class.findById(req.params.id)
    if (!currentClass) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (req.file) {
      try {
        if (
          currentClass.imagen &&
          currentClass.imagen.includes('cloudinary.com')
        ) {
          const publicId = currentClass.imagen.split('/').pop().split('.')[0]
          await cloudinary.uploader.destroy(`crossfit/clases/${publicId}`)
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'crossfit/clases'
        })
        classData.imagen = result.secure_url
        fs.unlinkSync(req.file.path)
      } catch (error) {
        console.error('Error al subir imagen a Cloudinary:', error)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    } else {
      classData.imagen = currentClass.imagen
    }

    classData.inscritos = currentClass.inscritos

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      classData,
      { new: true, runValidators: true }
    )
      .populate('inscritos', 'nombre email imagen rol')
      .populate('entrenador', 'nombre email imagen')

    res.status(200).json({
      success: true,
      message: 'Clase actualizada exitosamente',
      data: updatedClass
    })
  } catch (error) {
    console.error('Error al actualizar clase:', error)
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

    if (classItem.imagen && classItem.imagen.includes('cloudinary.com')) {
      try {
        const publicId = classItem.imagen.split('/').pop().split('.')[0]
        await cloudinary.uploader.destroy(`crossfit/clases/${publicId}`)
      } catch (error) {
        console.error('Error al eliminar imagen de Cloudinary:', error)
      }
    }

    await Class.deleteOne({ _id: classItem._id })

    res.status(200).json({
      success: true,
      message: 'Clase eliminada exitosamente',
      data: {}
    })
  } catch (error) {
    console.error('Error al eliminar clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la clase',
      error: error.message
    })
  }
}

exports.inscribirUsuario = async (req, res) => {
  try {
    const userId = req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const resultado = await ClassService.inscribirUsuario(
      req.params.id,
      userId,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción exitosa',
      data: resultado.clase,
      tipoSesionUsada: resultado.tipoSesionUsada
    })
  } catch (error) {
    console.error('Error en inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

exports.cancelarUsuario = async (req, res) => {
  try {
    const userId = req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const clase = await ClassService.cancelarUsuario(
      req.params.id,
      userId,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada exitosamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

exports.inscribirUsuarioAdmin = async (req, res) => {
  try {
    const { userId } = req.body
    const userIdFinal = userId || req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const resultado = await ClassService.inscribirUsuario(
      req.params.id,
      userIdFinal,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Usuario inscrito correctamente',
      data: resultado.clase,
      tipoSesionUsada: resultado.tipoSesionUsada
    })
  } catch (error) {
    console.error('Error al inscribir usuario:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

exports.cancelarUsuarioAdmin = async (req, res) => {
  try {
    const { userId } = req.body
    const userIdFinal = userId || req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const clase = await ClassService.cancelarUsuario(
      req.params.id,
      userIdFinal,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada correctamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}
