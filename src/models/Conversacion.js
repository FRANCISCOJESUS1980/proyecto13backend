const mongoose = require('mongoose')

const conversacionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ultimoMensaje: {
    type: String
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  },
  mensajesNoLeidos: [
    {
      usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cantidad: {
        type: Number,
        default: 0
      }
    }
  ]
})

module.exports = mongoose.model('Conversacion', conversacionSchema)
