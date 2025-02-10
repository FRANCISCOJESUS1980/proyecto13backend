const mongoose = require('mongoose')

module.exports = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de producto inválido'
    })
  }
  next()
}
