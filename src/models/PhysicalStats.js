const mongoose = require('mongoose')

const physicalStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  medidas: {
    altura: { type: Number },
    peso: { type: Number },
    grasa: { type: Number },
    musculo: { type: Number },
    pecho: { type: Number },
    cintura: { type: Number },
    cadera: { type: Number },
    biceps: { type: Number },
    muslos: { type: Number }
  },

  imc: {
    type: Number,
    default: function () {
      if (this.medidas.altura && this.medidas.peso) {
        const alturaMetros = this.medidas.altura / 100
        return (this.medidas.peso / (alturaMetros * alturaMetros)).toFixed(2)
      }
      return null
    }
  }
})

const objetivoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['peso', 'grasa', 'musculo', 'medida'],
    required: true
  },
  medida: {
    type: String,
    enum: [
      'peso',
      'grasa',
      'musculo',
      'pecho',
      'cintura',
      'cadera',
      'biceps',
      'muslos'
    ],
    required: true
  },
  valorInicial: {
    type: Number,
    required: true
  },
  valorObjetivo: {
    type: Number,
    required: true
  },
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  fechaObjetivo: {
    type: Date,
    required: true
  },
  completado: {
    type: Boolean,
    default: false
  },
  progreso: {
    type: Number,
    default: 0
  }
})

const PhysicalStats = mongoose.model('PhysicalStats', physicalStatsSchema)
const Objetivo = mongoose.model('Objetivo', objetivoSchema)

module.exports = { PhysicalStats, Objetivo }
