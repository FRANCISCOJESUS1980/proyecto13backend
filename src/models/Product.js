const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
    },
    descripcion: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
      set: (val) => Math.round(val * 100) / 100
    },
    imagen: {
      type: String,
      required: [true, 'La imagen es obligatoria']
    },
    imagenes: [
      {
        type: String
      }
    ],
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: ['suplementos', 'ropa', 'equipamiento', 'accesorios', 'otros'],
        message: '{VALUE} no es una categoría válida'
      }
    },
    subcategoria: {
      type: String,
      required: false
    },
    stock: {
      type: Number,
      required: [true, 'El stock es obligatorio'],
      min: [0, 'El stock no puede ser negativo'],
      default: 0
    },
    estado: {
      type: String,
      enum: {
        values: ['activo', 'inactivo', 'agotado'],
        message: '{VALUE} no es un estado válido'
      },
      default: 'activo'
    },
    marca: {
      type: String,
      required: [true, 'La marca es obligatoria'],
      trim: true
    },
    caracteristicas: [
      {
        nombre: {
          type: String,
          required: true
        },
        valor: {
          type: String,
          required: true
        }
      }
    ],
    tallas: [
      {
        talla: {
          type: String,
          required: true
        },
        stock: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],
    descuento: {
      tipo: {
        type: String,
        enum: ['porcentaje', 'monto', 'ninguno'],
        default: 'ninguno'
      },
      valor: {
        type: Number,
        min: 0,
        default: 0
      },
      fechaInicio: Date,
      fechaFin: Date
    },
    peso: {
      value: {
        type: Number,
        min: 0
      },
      unidad: {
        type: String,
        enum: ['g', 'kg', 'lb', 'oz']
      }
    },
    destacado: {
      type: Boolean,
      default: false
    },
    valoraciones: [
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        puntuacion: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comentario: String,
        fecha: {
          type: Date,
          default: Date.now
        }
      }
    ],
    etiquetas: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

ProductSchema.virtual('precioConDescuento').get(function () {
  if (!this.descuento || this.descuento.tipo === 'ninguno') return this.precio

  const valor = this.descuento.valor || 0

  if (this.descuento.tipo === 'porcentaje') {
    return this.precio * (1 - valor / 100)
  }

  if (this.descuento.tipo === 'monto') {
    return Math.max(0, this.precio - valor)
  }

  return this.precio
})

ProductSchema.virtual('promedioValoraciones').get(function () {
  if (!this.valoraciones || this.valoraciones.length === 0) return 0

  const suma = this.valoraciones.reduce((acc, val) => acc + val.puntuacion, 0)
  return Math.round((suma / this.valoraciones.length) * 10) / 10
})

ProductSchema.virtual('disponible').get(function () {
  return this.estado === 'activo' && this.stock > 0
})

ProductSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.estado = 'agotado'
  }
  next()
})

ProductSchema.index({ nombre: 'text', descripcion: 'text' })
ProductSchema.index({ categoria: 1, subcategoria: 1 })
ProductSchema.index({ precio: 1 })
ProductSchema.index({ 'descuento.fechaFin': 1 }, { sparse: true })

ProductSchema.statics.getProductosDestacados = function () {
  return this.find({ destacado: true, estado: 'activo' })
}

ProductSchema.statics.getProductosEnOferta = function () {
  return this.find({
    'descuento.tipo': { $ne: 'ninguno' },
    'descuento.fechaInicio': { $lte: new Date() },
    'descuento.fechaFin': { $gte: new Date() }
  })
}

ProductSchema.methods.actualizarStock = async function (cantidad) {
  if (this.stock + cantidad < 0) throw new Error('Stock insuficiente')
  this.stock += cantidad

  if (this.stock === 0) this.estado = 'agotado'
  else if (this.estado === 'agotado') this.estado = 'activo'

  return this.save()
}

ProductSchema.methods.agregarValoracion = async function (
  usuarioId,
  puntuacion,
  comentario
) {
  const valoracionExistente = this.valoraciones.find(
    (v) => v.usuario.toString() === usuarioId.toString()
  )

  if (valoracionExistente) {
    throw new Error('El usuario ya ha valorado este producto')
  }

  this.valoraciones.push({
    usuario: usuarioId,
    puntuacion,
    comentario,
    fecha: new Date()
  })

  return this.save()
}

module.exports = mongoose.model('Product', ProductSchema)
