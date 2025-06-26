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
    sesionesLibres: {
      type: Number,
      default: 0,
      min: 0
    },
    historialSesionesLibres: [
      {
        tipo: {
          type: String,
          enum: ['añadido', 'usado', 'expirado'],
          required: true
        },
        cantidad: {
          type: Number,
          required: true
        },
        motivo: {
          type: String,
          required: true
        },
        administrador: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        fecha: {
          type: Date,
          default: Date.now
        },
        detalles: {
          type: String
        }
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

UserSchema.methods.puedeReservarClase = async function () {
  if (this.bonoActivo) {
    await this.populate('bonoActivo')

    if (this.bonoActivo && this.bonoActivo.estado === 'activo') {
      if (this.bonoActivo.estaExpirado && this.bonoActivo.estaExpirado()) {
        return { puede: false, motivo: 'Bono expirado' }
      }

      if (
        this.bonoActivo.tipo !== 'Ilimitado' &&
        this.bonoActivo.sesionesRestantes <= 0
      ) {
        return { puede: false, motivo: 'Sin sesiones en el bono' }
      }

      return { puede: true, tipo: 'bono', bono: this.bonoActivo }
    }
  }

  if (this.sesionesLibres > 0) {
    return {
      puede: true,
      tipo: 'sesiones_libres',
      sesiones: this.sesionesLibres
    }
  }

  return { puede: false, motivo: 'Sin bono activo ni sesiones libres' }
}

UserSchema.methods.añadirSesionesLibres = async function (
  cantidad,
  motivo,
  administradorId,
  detalles = ''
) {
  this.sesionesLibres += cantidad

  this.historialSesionesLibres.push({
    tipo: 'añadido',
    cantidad,
    motivo,
    administrador: administradorId,
    detalles
  })

  await this.save()
  return this.sesionesLibres
}

UserSchema.methods.usarSesionLibre = async function (
  motivo = 'Clase reservada'
) {
  if (this.sesionesLibres <= 0) {
    throw new Error('No hay sesiones libres disponibles')
  }

  this.sesionesLibres -= 1

  this.historialSesionesLibres.push({
    tipo: 'usado',
    cantidad: 1,
    motivo
  })

  await this.save()
  return this.sesionesLibres
}

UserSchema.methods.obtenerResumenSesiones = async function () {
  await this.populate('bonoActivo')

  const resumen = {
    sesionesLibres: this.sesionesLibres,
    bono: null,
    totalSesionesDisponibles: this.sesionesLibres
  }

  if (this.bonoActivo && this.bonoActivo.estado === 'activo') {
    if (!this.bonoActivo.estaExpirado || !this.bonoActivo.estaExpirado()) {
      resumen.bono = {
        tipo: this.bonoActivo.tipo,
        sesionesRestantes: this.bonoActivo.sesionesRestantes,
        fechaFin: this.bonoActivo.fechaFin,
        estado: this.bonoActivo.estado
      }

      if (this.bonoActivo.tipo === 'Ilimitado') {
        resumen.totalSesionesDisponibles = 'Ilimitadas'
      } else {
        resumen.totalSesionesDisponibles += this.bonoActivo.sesionesRestantes
      }
    }
  }

  return resumen
}

UserSchema.methods.quitarSesionesLibres = async function (
  cantidad,
  motivo,
  administradorId
) {
  if (this.sesionesLibres < cantidad) {
    throw new Error('El usuario no tiene suficientes sesiones libres')
  }

  this.sesionesLibres -= cantidad

  this.historialSesionesLibres.push({
    tipo: 'expirado',
    cantidad: -cantidad,
    motivo: motivo || 'Removido por administrador',
    administrador: administradorId
  })

  await this.save()
  return this.sesionesLibres
}

module.exports = mongoose.model('User', UserSchema)
