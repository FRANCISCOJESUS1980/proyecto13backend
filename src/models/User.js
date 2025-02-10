const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const UserSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    apellidos: {
      type: String,
      trim: true,
      maxlength: [100, 'Los apellidos no pueden tener más de 100 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingrese un email válido'
      ]
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false
    },
    rol: {
      type: String,
      enum: {
        values: ['creador', 'admin', 'monitor', 'usuario'],
        message: '{VALUE} no es un rol válido'
      },
      default: 'usuario'
    },
    avatar: {
      type: String,
      default: 'default-avatar.jpg'
    },
    telefono: {
      type: String,
      match: [
        /^\+?[\d\s-]{8,}$/,
        'Por favor ingrese un número de teléfono válido'
      ]
    },
    fechaNacimiento: {
      type: Date
    },
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
    membresia: {
      tipo: {
        type: String,
        enum: ['basica', 'premium', 'ninguna'],
        default: 'ninguna'
      },
      fechaInicio: Date,
      fechaFin: Date
    },
    clasesFavoritas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      }
    ],
    clasesInscritas: [
      {
        clase: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Class'
        },
        fechaInscripcion: {
          type: Date,
          default: Date.now
        },
        estado: {
          type: String,
          enum: ['activa', 'completada', 'cancelada'],
          default: 'activa'
        }
      }
    ],
    historialCompras: [
      {
        producto: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        cantidad: Number,
        precioUnitario: Number,
        fechaCompra: {
          type: Date,
          default: Date.now
        }
      }
    ],
    notificaciones: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    ultimoAcceso: Date,
    verificado: {
      type: Boolean,
      default: false
    },
    tokenVerificacion: String
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

UserSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombre} ${this.apellidos || ''}`
})

UserSchema.virtual('edad').get(function () {
  if (!this.fechaNacimiento) return null
  return Math.floor(
    (new Date() - this.fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000)
  )
})
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }

  if (this.isNew || this.isModified('estado')) {
    this.ultimoAcceso = new Date()
  }

  next()
})

UserSchema.index({ email: true })
UserSchema.index({ rol: 1 })
UserSchema.index({ estado: 1 })

UserSchema.methods.compararPassword = async function (passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password)
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
  const verificationToken = crypto.randomBytes(20).toString('hex')
  this.tokenVerificacion = verificationToken
  return verificationToken
}

UserSchema.methods.inscribirseAClase = async function (claseId) {
  const yaInscrito = this.clasesInscritas.some(
    (inscripcion) => inscripcion.clase.toString() === claseId.toString()
  )

  if (yaInscrito) {
    throw new Error('Ya estás inscrito en esta clase')
  }

  this.clasesInscritas.push({
    clase: claseId,
    fechaInscripcion: new Date(),
    estado: 'activa'
  })

  return this.save()
}

UserSchema.methods.cancelarInscripcion = async function (claseId) {
  const inscripcion = this.clasesInscritas.find(
    (i) => i.clase.toString() === claseId.toString()
  )

  if (!inscripcion) {
    throw new Error('No estás inscrito en esta clase')
  }

  inscripcion.estado = 'cancelada'
  return this.save()
}

UserSchema.methods.agregarAFavoritos = async function (claseId) {
  if (this.clasesFavoritas.includes(claseId)) {
    throw new Error('La clase ya está en favoritos')
  }

  this.clasesFavoritas.push(claseId)
  return this.save()
}

UserSchema.methods.quitarDeFavoritos = async function (claseId) {
  this.clasesFavoritas = this.clasesFavoritas.filter(
    (id) => id.toString() !== claseId.toString()
  )
  return this.save()
}

UserSchema.statics.getUsuariosActivos = function () {
  return this.find({ estado: 'activo' })
}

UserSchema.statics.getMonitores = function () {
  return this.find({ rol: 'monitor', estado: 'activo' })
}

module.exports = mongoose.model('User', UserSchema)
