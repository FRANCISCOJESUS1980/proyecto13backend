const Class = require('../models/Class')
const User = require('../models/User')
const Bono = require('../models/Bono')
const {
  validarHorarioClase,
  validarCancelacionClase
} = require('../utils/classUtils')

class ClassService {
  static async inscribirUsuario(claseId, userId, esAdmin = false) {
    const usuario = await User.findById(userId).populate('bonoActivo')
    if (!usuario) {
      throw new Error('Usuario no encontrado')
    }

    const clase = await Class.findById(claseId)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    if (!clase) {
      throw new Error('Clase no encontrada')
    }

    if (clase.inscritos.length >= clase.capacidadMaxima) {
      throw new Error('La clase está llena')
    }

    if (
      clase.inscritos.some(
        (inscrito) => inscrito._id.toString() === userId.toString()
      )
    ) {
      throw new Error('Ya estás inscrito en esta clase')
    }

    const validacionHorario = validarHorarioClase(clase, esAdmin)
    if (!validacionHorario.valido) {
      throw new Error(validacionHorario.mensaje)
    }

    const { tipoSesionUsada, bonoUtilizado } = await this.procesarInscripcion(
      usuario,
      clase,
      esAdmin
    )

    if (!clase.historialInscripciones) {
      clase.historialInscripciones = []
    }

    clase.historialInscripciones.push({
      usuario: userId,
      fechaInscripcion: new Date(),
      estado: 'activa',
      bonoUtilizado: bonoUtilizado,
      tipoSesion: tipoSesionUsada,
      sesionDevuelta: false
    })

    clase.inscritos.push(userId)
    await clase.save()

    return {
      clase: await Class.findById(clase._id)
        .populate('inscritos', 'nombre email avatar rol')
        .populate('entrenador', 'nombre email avatar'),
      tipoSesionUsada
    }
  }

  static async cancelarUsuario(claseId, userId, esAdmin = false) {
    const usuario = await User.findById(userId).populate('bonoActivo')
    if (!usuario) {
      throw new Error('Usuario no encontrado')
    }

    const clase = await Class.findById(claseId)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    if (!clase) {
      throw new Error('Clase no encontrada')
    }

    const inscritoIndex = clase.inscritos.findIndex(
      (inscrito) => inscrito._id.toString() === userId.toString()
    )

    if (inscritoIndex === -1) {
      throw new Error('No estás inscrito en esta clase')
    }

    const validacionCancelacion = validarCancelacionClase(clase, esAdmin)
    if (!validacionCancelacion.valido) {
      throw new Error(validacionCancelacion.mensaje)
    }

    await this.procesarCancelacion(usuario, clase, userId, esAdmin)

    clase.inscritos = clase.inscritos.filter(
      (inscrito) => inscrito._id.toString() !== userId.toString()
    )

    await clase.save()

    return await Class.findById(clase._id)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')
  }

  static async procesarInscripcion(usuario, clase, esAdmin) {
    let tipoSesionUsada = null
    let bonoUtilizado = null

    if (!esAdmin) {
      const puedeReservar = await usuario.puedeReservarClase()

      if (!puedeReservar.puede) {
        throw new Error(
          puedeReservar.motivo ||
            'No tienes un bono activo ni sesiones libres para inscribirte a clases'
        )
      }

      if (puedeReservar.tipo === 'bono') {
        const bono = usuario.bonoActivo

        if (bono.estado !== 'activo') {
          throw new Error(
            `Tu bono está ${bono.estado}. Contacta con administración.`
          )
        }

        if (new Date() > new Date(bono.fechaFin)) {
          throw new Error(
            'Tu bono ha expirado. Contacta con administración para renovarlo.'
          )
        }

        if (bono.tipo !== 'Ilimitado') {
          bono.sesionesRestantes -= 1
          await bono.save()
          await bono.actualizarEstado()
        }

        tipoSesionUsada = 'bono'
        bonoUtilizado = bono._id
      } else if (puedeReservar.tipo === 'sesiones_libres') {
        await usuario.usarSesionLibre(`Clase: ${clase.nombre}`)
        tipoSesionUsada = 'sesiones_libres'
      }
    } else {
      tipoSesionUsada = 'admin'
    }

    return { tipoSesionUsada, bonoUtilizado }
  }

  static async procesarCancelacion(usuario, clase, userId, esAdmin) {
    if (esAdmin) return

    let inscripcionIndex = -1
    for (let i = clase.historialInscripciones.length - 1; i >= 0; i--) {
      const inscripcion = clase.historialInscripciones[i]
      if (
        inscripcion.usuario.toString() === userId.toString() &&
        inscripcion.estado === 'activa'
      ) {
        inscripcionIndex = i
        break
      }
    }

    if (inscripcionIndex !== -1) {
      const inscripcion = clase.historialInscripciones[inscripcionIndex]
      inscripcion.estado = 'cancelada'
      inscripcion.fechaCancelacion = new Date()

      if (inscripcion.tipoSesion === 'bono' && inscripcion.bonoUtilizado) {
        await this.procesarDevolucionBono(inscripcion, usuario)
      } else if (inscripcion.tipoSesion === 'sesiones_libres') {
        await usuario.añadirSesionesLibres(
          1,
          `Cancelación clase: ${clase.nombre}`,
          userId
        )
        inscripcion.sesionDevuelta = true
      }
    }
  }

  static async procesarDevolucionBono(inscripcion, usuario) {
    const bonoUtilizado = await Bono.findById(inscripcion.bonoUtilizado)

    if (bonoUtilizado) {
      const fechaFin = new Date(bonoUtilizado.fechaFin)
      fechaFin.setHours(23, 59, 59, 999)
      const estaExpiradoPorFecha = new Date() > fechaFin

      if (!estaExpiradoPorFecha) {
        if (bonoUtilizado.tipo !== 'Ilimitado') {
          bonoUtilizado.sesionesRestantes += 1
          await bonoUtilizado.save()
          await bonoUtilizado.actualizarEstado()

          if (bonoUtilizado.estado === 'activo' && !usuario.bonoActivo) {
            usuario.bonoActivo = bonoUtilizado._id
            await usuario.save()
          }
        }
        inscripcion.sesionDevuelta = true
      } else {
        inscripcion.sesionDevuelta = false
      }
    } else {
      inscripcion.sesionDevuelta = false
    }
  }
}

module.exports = ClassService
