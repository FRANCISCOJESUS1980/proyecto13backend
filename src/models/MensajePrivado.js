const mongoose = require('mongoose')

const mensajePrivadoSchema = new mongoose.Schema({
  conversacion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversacion',
    required: true
  },
  remitente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destinatario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  leido: {
    type: Boolean,
    default: false
  },
  editado: {
    type: Boolean,
    default: false
  },
  fechaEdicion: {
    type: Date,
    default: null
  }
})

module.exports = mongoose.model('MensajePrivado', mensajePrivadoSchema)
