const mongoose = require('mongoose')

const personalRecordSchema = new mongoose.Schema(
  {
    ejercicio: {
      type: String,
      required: [true, 'El ejercicio es obligatorio'],
      trim: true
    },
    peso: {
      type: String,
      required: [true, 'El peso es obligatorio'],
      trim: true
    },
    repeticiones: {
      type: String,
      default: '1',
      trim: true
    },
    fecha: {
      type: String,
      required: [true, 'La fecha es obligatoria']
    },
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: [
        'Levantamiento Olímpico',
        'Levantamiento de Potencia',
        'Gimnástico',
        'Cardio',
        'Otro'
      ],
      default: 'Levantamiento de Potencia'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

personalRecordSchema.index({ userId: 1, fecha: -1 })
personalRecordSchema.index({ userId: 1, ejercicio: 1 })
personalRecordSchema.index({ userId: 1, categoria: 1 })

const PersonalRecord = mongoose.model('PersonalRecord', personalRecordSchema)

module.exports = PersonalRecord
