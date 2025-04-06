const Class = require('../models/Class')
const User = require('../models/User')
const cloudinary = require('../config/cloudinary')
const fs = require('fs')

exports.createClass = async (req, res) => {
  try {
    const classData = {
      ...req.body
    }

    if (classData.entrenador === '') {
      delete classData.entrenador
    }

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

    if (classData.entrenador === '') {
      delete classData.entrenador
    }

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

exports.inscribirUsuarioClase = async (req, res) => {
  try {
    const { userId } = req.body
    const { id: claseId } = req.params

    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'creador' &&
      req.user.rol !== 'monitor'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      })
    }

    const usuario = await User.findById(userId)
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    let clase = await Class.findById(claseId)
    if (!clase) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (clase.inscritos.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya está inscrito en esta clase'
      })
    }

    if (clase.inscritos.length >= clase.capacidadMaxima) {
      return res.status(400).json({
        success: false,
        message: 'La clase está llena'
      })
    }

    clase.inscritos.push(userId)
    await clase.save()

    clase = await Class.findById(claseId)
      .populate('inscritos', 'nombre email avatar rol imagen')
      .populate('entrenador', 'nombre email avatar imagen')

    res.status(200).json({
      success: true,
      message: 'Usuario inscrito correctamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al inscribir usuario en clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al inscribir usuario en clase',
      error: error.message
    })
  }
}

exports.cancelarUsuarioClase = async (req, res) => {
  try {
    const { userId } = req.body
    const { id: claseId } = req.params

    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'creador' &&
      req.user.rol !== 'monitor'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      })
    }

    const usuario = await User.findById(userId)
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    let clase = await Class.findById(claseId)
    if (!clase) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (!clase.inscritos.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no está inscrito en esta clase'
      })
    }

    clase.inscritos = clase.inscritos.filter((id) => id.toString() !== userId)
    await clase.save()

    clase = await Class.findById(claseId)
      .populate('inscritos', 'nombre email avatar rol imagen')
      .populate('entrenador', 'nombre email avatar imagen')

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada correctamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar inscripción',
      error: error.message
    })
  }
}
