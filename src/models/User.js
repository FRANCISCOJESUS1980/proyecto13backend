const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const UserSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellidos: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true, select: false },
    rol: {
      type: String,
      enum: ['creador', 'admin', 'monitor', 'usuario'],
      default: 'usuario'
    },
    avatar: { type: String, default: 'default-avatar.jpg' },
    telefono: { type: String, trim: true },
    fechaNacimiento: { type: Date },
    genero: {
      type: String,
      enum: ['masculino', 'femenino', 'otro', 'prefiero no decir']
    },
    direccion: {
      calle: String,
      ciudad: String,
      codigoPostal: String,
      pais: String
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'suspendido'],
      default: 'activo'
    },
    bonoActivo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bono'
    },
    historialBonos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bono'
      }
    ],
    membresia: {
      tipo: {
        type: String,
        enum: ['basica', 'premium', 'ninguna'],
        default: 'ninguna'
      },
      fechaInicio: Date,
      fechaFin: Date
    },
    clasesFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    clasesInscritas: [
      {
        clase: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
        fechaInscripcion: { type: Date, default: Date.now },
        estado: {
          type: String,
          enum: ['activa', 'completada', 'cancelada'],
          default: 'activa'
        }
      }
    ],
    historialCompras: [
      {
        producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        cantidad: Number,
        precioUnitario: Number,
        fechaCompra: { type: Date, default: Date.now }
      }
    ],
    notificaciones: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    ultimoAcceso: Date,
    verificado: { type: Boolean, default: false },
    tokenVerificacion: String
  },
  { timestamps: true }
)

UserSchema.index({ rol: 1 })
UserSchema.index({ estado: 1 })

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  if (this.isNew || this.isModified('estado')) {
    this.ultimoAcceso = new Date()
  }
  next()
})

UserSchema.methods.compararPassword = function (passwordIngresado) {
  return bcrypt.compare(passwordIngresado, this.password)
}

UserSchema.methods.generarTokenResetPassword = function () {
  const resetToken = crypto.randomBytes(20).toString('hex')
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000
  return resetToken
}

UserSchema.methods.generarTokenVerificacion = function () {
  this.tokenVerificacion = crypto.randomBytes(20).toString('hex')
  return this.tokenVerificacion
}

UserSchema.statics.getUsuariosActivos = function () {
  return this.find({ estado: 'activo' })
}

UserSchema.statics.getMonitores = function () {
  return this.find({ rol: 'monitor', estado: 'activo' })
}

module.exports = mongoose.model('User', UserSchema)
