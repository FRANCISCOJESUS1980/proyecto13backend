const verificarPermisosAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'creador', 'monitor'].includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para realizar esta acción'
    })
  }
  next()
}

const verificarPermisosCreador = (req, res, next) => {
  if (!req.user || req.user.rol !== 'creador') {
    return res.status(403).json({
      success: false,
      message: 'Solo el creador puede realizar esta acción'
    })
  }
  next()
}

const verificarPermisosAdminOCreador = (req, res, next) => {
  if (!req.user || !['admin', 'creador'].includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'Necesitas permisos de administrador o creador'
    })
  }
  next()
}

module.exports = {
  verificarPermisosAdmin,
  verificarPermisosCreador,
  verificarPermisosAdminOCreador
}
