const jwt = require('jsonwebtoken')
const User = require('../models/User')

exports.protect = async (req, res, next) => {
  try {
    let token

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token no válido'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message
    })
  }
}

exports.admin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    return next()
  }
  return res
    .status(403)
    .json({ message: 'Acción prohibida, necesitas ser administrador' })
}
