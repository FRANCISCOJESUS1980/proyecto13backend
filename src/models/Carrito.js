const mongoose = require('mongoose')

const CarritoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
      },
      nombre: {
        type: String,
        required: true
      },
      precio: {
        type: Number,
        required: true
      },
      imagen: String,
      marca: String,
      quantity: {
        type: Number,
        required: true,
        min: 1
      }
    }
  ],
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
})

CarritoSchema.pre('save', function (next) {
  this.fechaActualizacion = Date.now()
  next()
})

module.exports = mongoose.model('Carrito', CarritoSchema)
