const jwt = require('jsonwebtoken')
const User = require('../models/User')

exports.protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await User.findById(decoded.id).select('-password')

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado, token inválido'
        })
      }

      req.user = user
      next()
    } catch (error) {
      console.error('Error en middleware de autenticación:', error)
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token inválido'
      })
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'No autorizado, no hay token'
    })
  }
}

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.rol} no está autorizado para acceder a este recurso`
      })
    }

    next()
  }
}
