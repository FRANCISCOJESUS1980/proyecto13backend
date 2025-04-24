const mongoose = require('mongoose')

const PedidoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productos: [
    {
      producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
      },
      cantidad: {
        type: Number,
        required: true,
        min: 1
      },
      precio: {
        type: Number,
        required: true
      }
    }
  ],
  total: {
    type: Number,
    required: true
  },
  estado: {
    type: String,
    enum: [
      'pendiente',
      'procesando',
      'enviado',
      'entregado',
      'cancelado',
      'completado'
    ],
    default: 'pendiente'
  },
  metodoPago: {
    type: String,
    required: true
  },
  infoEnvio: {
    direccion: String,
    ciudad: String,
    codigoPostal: String,
    pais: String
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date
  }
})

PedidoSchema.pre('save', function (next) {
  this.fechaActualizacion = new Date()
  next()
})

module.exports = mongoose.model('Pedido', PedidoSchema)
