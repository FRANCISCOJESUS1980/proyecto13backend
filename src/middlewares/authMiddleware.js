const jwt = require('jsonwebtoken')
const User = require('../models/User')

exports.protect = async (req, res, next) => {
  try {
    let token =
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : req.cookies.token

    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado' })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
      next()
    } catch (error) {
      return res
        .status(401)
        .json({ success: false, message: 'Token no válido' })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message
    })
  }
}

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.rol} no está autorizado`
      })
    }
    next()
  }
}
