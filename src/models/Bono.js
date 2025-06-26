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
    fechaFinOriginal: {
      type: Date
    },
    estado: {
      type: String,
      enum: ['activo', 'pausado', 'finalizado', 'expirado', 'agotado'],
      default: 'activo'
    },
    motivoPausa: {
      type: String
    },
    fechaPausa: {
      type: Date
    },
    diasTotalExtension: {
      type: Number,
      default: 0
    },
    historialPausas: [
      {
        fechaInicio: {
          type: Date,
          required: true
        },
        fechaFin: {
          type: Date
        },
        motivo: {
          type: String,
          required: true
        },
        diasExtension: {
          type: Number,
          default: 0
        }
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

BonoSchema.statics.calcularDiasPausa = (fechaInicio, fechaFin = new Date()) => {
  if (!fechaInicio) return 0

  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)

  const diferenciaMilisegundos = fin.getTime() - inicio.getTime()
  const dias = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24))

  return Math.max(0, dias)
}

BonoSchema.methods.calcularDiasPausa = function (
  fechaInicio,
  fechaFin = new Date()
) {
  return this.constructor.calcularDiasPausa(fechaInicio, fechaFin)
}

BonoSchema.methods.estaExpiradoPorFecha = function () {
  const ahora = new Date()
  const fechaFin = new Date(this.fechaFin)

  fechaFin.setHours(23, 59, 59, 999)

  return ahora > fechaFin
}

BonoSchema.methods.estaAgotadoPorSesiones = function () {
  return (
    this.tipo !== 'Ilimitado' &&
    this.sesionesRestantes <= 0 &&
    !this.estaExpiradoPorFecha()
  )
}

BonoSchema.methods.puedeSerReactivado = function () {
  return (
    (this.estado === 'agotado' ||
      this.estado === 'pausado' ||
      this.estado === 'activo') &&
    !this.estaExpiradoPorFecha()
  )
}

BonoSchema.methods.obtenerEstadoReal = function () {
  if (this.estado === 'finalizado') {
    return 'finalizado'
  }

  if (this.estado === 'pausado') {
    return 'pausado'
  }

  if (this.estaExpiradoPorFecha()) {
    return 'expirado'
  }

  if (this.estaAgotadoPorSesiones()) {
    return 'agotado'
  }

  return 'activo'
}

BonoSchema.methods.intentarReactivacionAutomatica = async function () {
  const estadoReal = this.obtenerEstadoReal()

  console.log(`=== INTENTAR REACTIVACIÓN AUTOMÁTICA ===`)
  console.log(`Bono ID: ${this._id}`)
  console.log(`Estado actual: ${this.estado}`)
  console.log(`Estado real calculado: ${estadoReal}`)
  console.log(`Sesiones restantes: ${this.sesionesRestantes}`)
  console.log(`Expirado por fecha: ${this.estaExpiradoPorFecha()}`)
  console.log(`Puede ser reactivado: ${this.puedeSerReactivado()}`)

  if (this.estado !== estadoReal) {
    console.log(`Actualizando estado: ${this.estado} -> ${estadoReal}`)
    this.estado = estadoReal

    if (
      estadoReal === 'activo' &&
      (this.estado === 'agotado' || this.estado === 'expirado')
    ) {
      const User = mongoose.model('User')
      await User.findByIdAndUpdate(this.usuario, {
        bonoActivo: this._id
      })
      console.log(`Usuario actualizado con bono activo: ${this._id}`)
    }

    if (estadoReal === 'expirado' && this.estado !== 'expirado') {
      const User = mongoose.model('User')
      await User.findByIdAndUpdate(this.usuario, {
        $unset: { bonoActivo: 1 }
      })
      console.log(`Bono removido del usuario por expiración`)
    }

    await this.save()
  }

  return estadoReal
}

BonoSchema.methods.actualizarEstado = async function () {
  return await this.intentarReactivacionAutomatica()
}

BonoSchema.methods.obtenerInfoPausaActual = function () {
  if (this.estado !== 'pausado' || !this.fechaPausa) {
    return null
  }

  const diasPausado = this.calcularDiasPausa(this.fechaPausa)

  return {
    fechaPausa: this.fechaPausa,
    motivoPausa: this.motivoPausa,
    diasPausado,
    extensionCalculada: diasPausado
  }
}

BonoSchema.methods.devolverSesiones = async function (
  cantidad,
  motivo = 'Devolución de sesión'
) {
  console.log(`=== DEVOLVER SESIONES ===`)
  console.log(`Bono ID: ${this._id}`)
  console.log(`Estado actual: ${this.estado}`)
  console.log(`Sesiones a devolver: ${cantidad}`)
  console.log(`Sesiones actuales: ${this.sesionesRestantes}`)

  if (!this.puedeSerReactivado()) {
    console.log(
      `Bono no puede ser reactivado. Estado: ${
        this.estado
      }, Expirado: ${this.estaExpiradoPorFecha()}`
    )
    return false
  }

  this.sesionesRestantes += cantidad
  console.log(`Nuevas sesiones restantes: ${this.sesionesRestantes}`)

  await this.intentarReactivacionAutomatica()

  return true
}

BonoSchema.statics.actualizarBonosExpirados = async function () {
  try {
    const bonosActivos = await this.find({
      estado: { $in: ['activo', 'agotado'] }
    }).populate('usuario')

    let bonosActualizados = 0

    for (const bono of bonosActivos) {
      const estadoAnterior = bono.estado
      await bono.actualizarEstado()

      if (bono.estado !== estadoAnterior) {
        bonosActualizados++
      }
    }

    console.log(
      `Verificación de bonos completada. ${bonosActualizados} bonos actualizados.`
    )
    return bonosActualizados
  } catch (error) {
    console.error('Error al actualizar bonos expirados:', error)
    throw error
  }
}

BonoSchema.pre('save', function (next) {
  if (this.isNew && !this.fechaFinOriginal) {
    this.fechaFinOriginal = this.fechaFin
  }
  next()
})

module.exports = mongoose.model('Bono', BonoSchema)
