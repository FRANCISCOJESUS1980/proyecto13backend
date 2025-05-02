const mongoose = require('mongoose')

const BonoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    sesiones: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    descripcion: {
      type: String,
      trim: true
    },
    precio: {
      type: Number,
      required: true
    },
    caracteristicas: {
      type: [String],
      default: []
    },
    popular: {
      type: Boolean,
      default: false
    },
    tipo: {
      type: String,
      enum: ['mensual', 'especial', 'drop-in'],
      required: true
    },
    limiteDiario: {
      type: Number,
      default: null
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Bono', BonoSchema)
