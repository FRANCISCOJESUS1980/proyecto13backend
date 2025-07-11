const mongoose = require('mongoose')

const consentimientoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nombreCompleto: {
      type: String,
      required: true,
      trim: true
    },
    dni: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    firmaDigital: {
      type: String,
      required: true
    },
    aceptado: {
      type: Boolean,
      required: true,
      default: false
    },
    autorizaImagen: {
      type: Boolean,
      required: true
    },
    fechaAceptacion: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

consentimientoSchema.index({ userId: 1 })

module.exports = mongoose.model('Consentimiento', consentimientoSchema)
