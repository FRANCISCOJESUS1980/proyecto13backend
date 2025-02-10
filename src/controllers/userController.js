const User = require('../models/User')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

exports.registerUser = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe con este email'
      })
    }

    const user = await User.create({
      nombre,
      email,
      password,
      rol: rol || 'user'
    })

    res.status(201).json({
      success: true,
      data: {
        _id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user.id)
      },
      message: 'Usuario registrado exitosamente'
    })
  } catch (error) {
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user.id)
      },
      message: 'Inicio de sesión exitoso'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el inicio de sesión',
      error: error.message
    })
  }
}

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
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
    const { nombre, email } = req.body

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user.id }
      })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso'
        })
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { nombre, email },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser.id,
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        rol: updatedUser.rol
      },
      message: 'Perfil actualizado exitosamente'
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
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select('+password')

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      })
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
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
    const users = await User.find().select('-password')
    res.status(200).json({
      success: true,
      count: users.length,
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
    const user = await User.findById(req.params.id).select('-password')
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
    const { nombre, email, rol } = req.body
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso'
        })
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { nombre, email, rol },
      { new: true, runValidators: true }
    ).select('-password')

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado exitosamente'
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
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    await User.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    })
  }
}
