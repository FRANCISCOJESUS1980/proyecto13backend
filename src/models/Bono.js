const mongoose = require('mongoose')

const BonoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tipo: {
      type: String,
      required: true,
      enum: [
        '8 Sesiones',
        '10 Sesiones',
        '12 Sesiones',
        '16 Sesiones',
        '20 Sesiones',
        'Ilimitado',
        'Bono 5 sesiones',
        'Curso de iniciación + 2 meses',
        'Drop in'
      ]
    },
    sesionesTotal: {
      type: Number,
      required: true
    },
    sesionesRestantes: {
      type: Number,
      required: true
    },
    fechaInicio: {
      type: Date,
      required: true,
      default: Date.now
    },
    fechaFin: {
      type: Date,
      required: true
    },
    estado: {
      type: String,
      enum: ['activo', 'pausado', 'finalizado'],
      default: 'activo'
    },
    motivoPausa: {
      type: String
    },
    fechaPausa: {
      type: Date
    },
    historialPausas: [
      {
        fechaInicio: Date,
        fechaFin: Date,
        motivo: String
      }
    ],
    precio: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Bono', BonoSchema)
