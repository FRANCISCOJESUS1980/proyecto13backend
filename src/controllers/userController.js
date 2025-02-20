const User = require('../models/User')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const cloudinary = require('../config/cloudinary')
const fs = require('fs').promises

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

exports.verificarCodigo = async (req, res) => {
  try {
    const { codigo } = req.body
    console.log('Código recibido en el servidor:', codigo)

    const codigoRecibido = String(codigo).trim()
    const codigoCreador = String(process.env.CODIGO_SECRETO_CREADOR).trim()
    const codigoAdmin = String(process.env.CODIGO_SECRETO_ADMIN).trim()
    const codigoMonitor = String(process.env.CODIGO_SECRETO_MONITOR).trim()

    if (codigoRecibido === codigoCreador) {
      const existingCreator = await User.findOne({ rol: 'creador' })
      if (existingCreator) {
        return res.status(403).json({
          success: false,
          message: 'Ya existe un usuario con rol de creador'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Código válido para creador',
        rol: 'creador'
      })
    }

    if (codigoRecibido === codigoAdmin) {
      return res.status(200).json({
        success: true,
        message: 'Código válido para administrador',
        rol: 'admin'
      })
    }

    if (codigoRecibido === codigoMonitor) {
      return res.status(200).json({
        success: true,
        message: 'Código válido para monitor',
        rol: 'monitor'
      })
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

    console.log('Archivo recibido:', req.file)

    const userExists = await User.findOne({ email })
    if (userExists) {
      if (req.file) {
        await fs.unlink(req.file.path)
      }
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe con este email'
      })
    }

    if (['creador', 'admin', 'monitor'].includes(rol)) {
      const codigoRecibido = String(codigoAutorizacion).trim()
      let codigoEsperado

      switch (rol) {
        case 'creador':
          codigoEsperado = String(process.env.CODIGO_SECRETO_CREADOR).trim()
          break
        case 'admin':
          codigoEsperado = String(process.env.CODIGO_SECRETO_ADMIN).trim()
          break
        case 'monitor':
          codigoEsperado = String(process.env.CODIGO_SECRETO_MONITOR).trim()
          break
        default:
          break
      }

      if (codigoRecibido !== codigoEsperado) {
        if (req.file) {
          await fs.unlink(req.file.path)
        }
        return res.status(403).json({
          success: false,
          message: `Código de autorización inválido para rol de ${rol}`
        })
      }

      if (rol === 'creador') {
        const existingCreator = await User.findOne({ rol: 'creador' })
        if (existingCreator) {
          if (req.file) {
            await fs.unlink(req.file.path)
          }
          return res.status(403).json({
            success: false,
            message: 'Ya existe un usuario con rol de creador'
          })
        }
      }
    }

    if (req.file) {
      try {
        console.log('Subiendo imagen a Cloudinary...')
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'avatars',
          width: 150,
          height: 150,
          crop: 'fill'
        })
        console.log('Respuesta de Cloudinary:', result)
        avatarUrl = result.secure_url

        await fs.unlink(req.file.path)
        console.log('Archivo temporal eliminado')
      } catch (error) {
        console.error('Error al subir imagen a Cloudinary:', error)
        if (req.file) {
          await fs.unlink(req.file.path)
        }
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    }

    console.log('Creando usuario con avatar:', avatarUrl)
    const user = await User.create({
      nombre,
      email,
      password,
      rol,
      avatar: avatarUrl
    })

    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatar: user.avatar,
        token
      }
    })
  } catch (error) {
    console.error('Error en registerUser:', error)
    if (req.file) {
      await fs.unlink(req.file.path)
    }
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
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
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
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: user
    })
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
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true
    })

    res.status(200).json({
      success: true,
      data: user
    })
  } catch (error) {
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
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      })
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    })
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
    res.status(200).json({
      success: true,
      data: users
    })
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
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: user
    })
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: user
    })
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
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado correctamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    })
  }
}
/*const User = require('../models/User')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const cloudinary = require('../config/cloudinary')
const fs = require('fs').promises

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

exports.verificarCodigo = async (req, res) => {
  const { codigo } = req.body
  console.log('Código recibido en el servidor:', codigo)

  const codigoRecibido = String(codigo).trim()
  const codigoCreador = String(process.env.CODIGO_SECRETO_CREADOR).trim()
  const codigoAdmin = String(process.env.CODIGO_SECRETO_ADMIN).trim()
  const codigoMonitor = String(process.env.CODIGO_SECRETO_MONITOR).trim()

  if (codigoRecibido === codigoCreador) {
    const existingCreator = await User.findOne({ rol: 'creador' })
    if (existingCreator) {
      return res.status(403).json({
        success: false,
        message: 'Ya existe un usuario con rol de creador'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Código válido para creador',
      rol: 'creador'
    })
  }

  if (codigoRecibido === codigoAdmin) {
    return res.status(200).json({
      success: true,
      message: 'Código válido para administrador',
      rol: 'admin'
    })
  }

  if (codigoRecibido === codigoMonitor) {
    return res.status(200).json({
      success: true,
      message: 'Código válido para monitor',
      rol: 'monitor'
    })
  }

  return res.status(403).json({
    success: false,
    message: 'Código inválido'
  })
}

exports.registerUser = async (req, res) => {
  const { nombre, email, password, rol, codigoAutorizacion } = req.body
  let avatarUrl = 'default-avatar.jpg'

  console.log('Archivo recibido:', req.file)

  const userExists = await User.findOne({ email })
  if (userExists) {
    if (req.file) {
      await fs.unlink(req.file.path)
    }
    return res.status(400).json({
      success: false,
      message: 'El usuario ya existe con este email'
    })
  }

  if (['creador', 'admin', 'monitor'].includes(rol)) {
    const codigoRecibido = String(codigoAutorizacion).trim()
    let codigoEsperado

    switch (rol) {
      case 'creador':
        codigoEsperado = String(process.env.CODIGO_SECRETO_CREADOR).trim()
        break
      case 'admin':
        codigoEsperado = String(process.env.CODIGO_SECRETO_ADMIN).trim()
        break
      case 'monitor':
        codigoEsperado = String(process.env.CODIGO_SECRETO_MONITOR).trim()
        break
      default:
        break
    }

    if (codigoRecibido !== codigoEsperado) {
      if (req.file) {
        await fs.unlink(req.file.path)
      }
      return res.status(403).json({
        success: false,
        message: `Código de autorización inválido para rol de ${rol}`
      })
    }

    if (rol === 'creador') {
      const existingCreator = await User.findOne({ rol: 'creador' })
      if (existingCreator) {
        if (req.file) {
          await fs.unlink(req.file.path)
        }
        return res.status(403).json({
          success: false,
          message: 'Ya existe un usuario con rol de creador'
        })
      }
    }
  }

  if (req.file) {
    try {
      console.log('Subiendo imagen a Cloudinary...')
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'avatars',
        width: 150,
        height: 150,
        crop: 'fill'
      })
      console.log('Respuesta de Cloudinary:', result)
      avatarUrl = result.secure_url

      await fs.unlink(req.file.path)
      console.log('Archivo temporal eliminado')
    } catch (error) {
      console.error('Error al subir imagen a Cloudinary:', error)
      if (req.file) {
        await fs.unlink(req.file.path)
      }
      return res.status(500).json({
        success: false,
        message: 'Error al subir la imagen',
        error: error.message
      })
    }
  }

  console.log('Creando usuario con avatar:', avatarUrl)
  const user = await User.create({
    nombre,
    email,
    password,
    rol,
    avatar: avatarUrl
  })

  const token = generateToken(user._id)

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      avatar: user.avatar,
      token
    }
  })
}

exports.loginUser = async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.compararPassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    })
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
}

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    })
  }

  res.status(200).json({
    success: true,
    data: user
  })
}

exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true
  })

  res.status(200).json({
    success: true,
    data: user
  })
}

exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select('+password')
  const { currentPassword, newPassword } = req.body

  if (!(await user.compararPassword(currentPassword))) {
    return res.status(401).json({
      success: false,
      message: 'Contraseña actual incorrecta'
    })
  }

  user.password = newPassword
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada correctamente'
  })
}

exports.getAllUsers = async (req, res) => {
  const users = await User.find()
  res.status(200).json({
    success: true,
    data: users
  })
}

exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    })
  }

  res.status(200).json({
    success: true,
    data: user
  })
}

exports.updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    })
  }

  res.status(200).json({
    success: true,
    data: user
  })
}

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id)
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    })
  }

  res.status(200).json({
    success: true,
    message: 'Usuario eliminado correctamente'
  })
}*/
