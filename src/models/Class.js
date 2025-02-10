const mongoose = require('mongoose')

const ClassSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    monitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El monitor es obligatorio']
    },
    horario: {
      type: String,
      required: [true, 'El horario es obligatorio']
    },
    duracion: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      min: [15, 'La duración mínima es de 15 minutos'],
      max: [180, 'La duración máxima es de 180 minutos']
    },
    capacidadMaxima: {
      type: Number,
      required: [true, 'La capacidad máxima es obligatoria'],
      min: [1, 'La capacidad mínima es de 1 persona'],
      max: [50, 'La capacidad máxima es de 50 personas']
    },
    inscritos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: ['yoga', 'pilates', 'cardio', 'fuerza', 'baile', 'otro'],
        message: '{VALUE} no es una categoría válida'
      }
    },
    nivel: {
      type: String,
      required: [true, 'El nivel es obligatorio'],
      enum: {
        values: ['principiante', 'intermedio', 'avanzado'],
        message: '{VALUE} no es un nivel válido'
      }
    },
    estado: {
      type: String,
      enum: {
        values: ['activa', 'cancelada', 'completada'],
        message: '{VALUE} no es un estado válido'
      },
      default: 'activa'
    },
    diasSemana: [
      {
        type: String,
        enum: {
          values: [
            'lunes',
            'martes',
            'miércoles',
            'jueves',
            'viernes',
            'sábado',
            'domingo'
          ],
          message: '{VALUE} no es un día válido'
        }
      }
    ],
    ubicacion: {
      type: String,
      required: [true, 'La ubicación es obligatoria'],
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

ClassSchema.virtual('espaciosDisponibles').get(function () {
  return this.capacidadMaxima - (this.inscritos ? this.inscritos.length : 0)
})

ClassSchema.virtual('estaLlena').get(function () {
  return this.inscritos.length >= this.capacidadMaxima
})

ClassSchema.pre('save', function (next) {
  if (this.inscritos && this.inscritos.length > this.capacidadMaxima) {
    return next(new Error('La clase ha excedido su capacidad máxima'))
  }
  next()
})

ClassSchema.index({ categoria: 1, nivel: 1 })
ClassSchema.index({ estado: 1 })
ClassSchema.index({ monitor: 1 })

ClassSchema.statics.getClasesPorMonitor = function (monitorId) {
  return this.find({ monitor: monitorId })
    .populate('monitor', 'nombre email')
    .populate('inscritos', 'nombre email')
}

ClassSchema.methods.inscribirUsuario = async function (userId) {
  if (this.inscritos.includes(userId)) {
    throw new Error('El usuario ya está inscrito en esta clase')
  }

  if (this.inscritos.length >= this.capacidadMaxima) {
    throw new Error('La clase está llena')
  }

  this.inscritos.push(userId)
  return this.save()
}

ClassSchema.methods.desinscribirUsuario = async function (userId) {
  if (this.inscritos.some((id) => id.toString() === userId.toString())) {
    throw new Error('El usuario ya está inscrito en esta clase')
  }

  this.inscritos = this.inscritos.filter(
    (id) => id.toString() !== userId.toString()
  )
  return this.save()
}

module.exports = mongoose.model('Class', ClassSchema)
