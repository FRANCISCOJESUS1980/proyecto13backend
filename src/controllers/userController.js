const User = require('../models/User')
const jwt = require('jsonwebtoken')
const cloudinary = require('../config/cloudinary')
const fs = require('fs').promises

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

const deleteLocalFile = async (path) => {
  try {
    await fs.unlink(path)
  } catch (error) {
    console.error(`Error eliminando archivo local: ${path}`, error)
  }
}

const getRoleCode = (rol) => {
  switch (rol) {
    case 'creador':
      return process.env.CODIGO_SECRETO_CREADOR?.trim()
    case 'admin':
      return process.env.CODIGO_SECRETO_ADMIN?.trim()
    case 'monitor':
      return process.env.CODIGO_SECRETO_MONITOR?.trim()
    default:
      return null
  }
}

const uploadToCloudinary = async (
  filePath,
  folder = 'avatars',
  width = 150,
  height = 150
) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    width,
    height,
    crop: 'fill'
  })
  await deleteLocalFile(filePath)
  return result.secure_url
}

exports.verificarCodigo = async (req, res) => {
  try {
    const { codigo } = req.body
    const codigoRecibido = String(codigo).trim()

    const roles = ['creador', 'admin', 'monitor']

    for (const rol of roles) {
      const codigoEsperado = getRoleCode(rol)
      if (codigoRecibido === codigoEsperado) {
        if (rol === 'creador') {
          const existingCreator = await User.findOne({ rol: 'creador' })
          if (existingCreator) {
            return res.status(403).json({
              success: false,
              message: 'Ya existe un usuario con rol de creador'
            })
          }
        }

        return res.status(200).json({
          success: true,
          message: `Código válido para ${rol}`,
          rol
        })
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Código inválido'
    })
  } catch (error) {
    console.error('Error en verificarCodigo:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el código',
      error: error.message
    })
  }
}

exports.registerUser = async (req, res) => {
  try {
    const { nombre, email, password, rol, codigoAutorizacion } = req.body
    let avatarUrl = 'default-avatar.jpg'

    if (await User.findOne({ email })) {
      if (req.file) await deleteLocalFile(req.file.path)
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe con este email'
      })
    }

    if (['creador', 'admin', 'monitor'].includes(rol)) {
      const codigoEsperado = getRoleCode(rol)
      if (String(codigoAutorizacion).trim() !== codigoEsperado) {
        if (req.file) await deleteLocalFile(req.file.path)
        return res.status(403).json({
          success: false,
          message: `Código de autorización inválido para rol de ${rol}`
        })
      }

      if (rol === 'creador') {
        const existingCreator = await User.findOne({ rol: 'creador' })
        if (existingCreator) {
          if (req.file) await deleteLocalFile(req.file.path)
          return res.status(403).json({
            success: false,
            message: 'Ya existe un usuario con rol de creador'
          })
        }
      }
    }

    if (req.file) {
      try {
        avatarUrl = await uploadToCloudinary(req.file.path)
      } catch (error) {
        if (req.file) await deleteLocalFile(req.file.path)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    }

    const user = await User.create({
      nombre,
      email,
      password,
      rol,
      avatar: avatarUrl
    })

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatar: user.avatar,
        token: generateToken(user._id)
      }
    })
  } catch (error) {
    console.error('Error en registerUser:', error)
    if (req.file) await deleteLocalFile(req.file.path)
    res.status(500).json({
      success: false,
      message: 'Error en el registro',
      error: error.message
    })
  }
}

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.compararPassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: 'Credenciales inválidas' })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatar: user.avatar,
        token: generateToken(user._id)
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el login',
      error: error.message
    })
  }
}

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado' })

    res.status(200).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil',
      error: error.message
    })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const userData = { ...req.body }

    if (userData.direccion && typeof userData.direccion === 'string') {
      try {
        userData.direccion = JSON.parse(userData.direccion)
      } catch (e) {
        console.error('Error al parsear direccion:', e)
      }
    }

    if (req.file) {
      try {
        userData.avatar = await uploadToCloudinary(
          req.file.path,
          'crossfit/usuarios',
          200,
          200
        )
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, userData, {
      new: true,
      runValidators: true
    })

    res.status(200).json({ success: true, data: user })
  } catch (error) {
    console.error('Error al actualizar perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el perfil',
      error: error.message
    })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password')
    const { currentPassword, newPassword } = req.body

    if (!(await user.compararPassword(currentPassword))) {
      return res
        .status(401)
        .json({ success: false, message: 'Contraseña actual incorrecta' })
    }

    user.password = newPassword
    await user.save()

    res
      .status(200)
      .json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: error.message
    })
  }
}

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
    res.status(200).json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los usuarios',
      error: error.message
    })
  }
}

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado' })

    res.status(200).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el usuario',
      error: error.message
    })
  }
}

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado' })

    res.status(200).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el usuario',
      error: error.message
    })
  }
}

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'Usuario no encontrado' })

    res
      .status(200)
      .json({ success: true, message: 'Usuario eliminado correctamente' })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    })
  }
}

exports.getEntrenadores = async (req, res) => {
  try {
    const entrenadores = await User.find({ rol: 'monitor' }).select(
      'nombre email imagen rol'
    )
    res
      .status(200)
      .json({ success: true, count: entrenadores.length, data: entrenadores })
  } catch (error) {
    console.error('Error al obtener entrenadores:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los entrenadores',
      error: error.message
    })
  }
}

exports.getCurrentUser = (req, res) => {
  res.status(200).json({
    userId: req.user._id,
    nombre: req.user.nombre,
    email: req.user.email,
    rol: req.user.rol,
    imagen: req.user.imagen
  })
}
