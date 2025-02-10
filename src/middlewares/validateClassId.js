const mongoose = require('mongoose')

const validateClassId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de clase no válido' })
  }
  next()
}

module.exports = validateClassId
