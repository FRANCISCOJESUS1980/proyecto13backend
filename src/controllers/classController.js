const Class = require('../models/Class')
const User = require('../models/User')
const Bono = require('../models/Bono')
const cloudinary = require('../config/cloudinary')
const fs = require('fs')

const obtenerHoraClase = (classItem) => {
  try {
    if (!classItem.horario) return null

    let fechaClase

    if (classItem.esFechaEspecifica && classItem.fecha) {
      fechaClase = new Date(classItem.fecha)
    } else {
      const hoy = new Date()
      const diasSemana = [
        'domingo',
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado'
      ]
      const diaSemanaHoy = diasSemana[hoy.getDay()]

      if (classItem.diaSemana === diaSemanaHoy) {
        fechaClase = new Date()
      } else {
        fechaClase = obtenerFechaPorDiaSemana(classItem.diaSemana)
      }
    }

    if (!fechaClase) return null

    const [horas, minutos] = classItem.horario.split(':')
    fechaClase.setHours(
      Number.parseInt(horas, 10),
      Number.parseInt(minutos, 10),
      0,
      0
    )

    return fechaClase
  } catch (error) {
    console.error('Error al obtener hora de clase:', error)
    return null
  }
}

const obtenerFechaPorDiaSemana = (diaSemana) => {
  if (!diaSemana) return null

  const diasSemana = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado'
  ]
  const diaIndice = diasSemana.indexOf(diaSemana.toLowerCase())

  if (diaIndice === -1) return null

  const hoy = new Date()
  const diaActual = hoy.getDay()

  let diasHasta = diaIndice - diaActual
  if (diasHasta <= 0) diasHasta += 7

  const fechaObjetivo = new Date(hoy)
  fechaObjetivo.setDate(hoy.getDate() + diasHasta)

  return fechaObjetivo
}

const esHoy = (fecha) => {
  const hoy = new Date()
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  )
}

const esDiaPasado = (fecha) => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaComparar = new Date(fecha)
  fechaComparar.setHours(0, 0, 0, 0)
  return fechaComparar < hoy
}

const validarHorarioClase = (classItem, esAdmin) => {
  if (esAdmin) return { valido: true }

  const horaActual = new Date()
  const horaClase = obtenerHoraClase(classItem)

  if (!horaClase) return { valido: true }

  if (esDiaPasado(horaClase)) {
    return {
      valido: false,
      mensaje: 'No puedes inscribirte a una clase de un día pasado'
    }
  }

  if (esHoy(horaClase)) {
    const diferenciaMinutos = (horaActual - horaClase) / (1000 * 60)
    if (diferenciaMinutos > 10) {
      return {
        valido: false,
        mensaje:
          'No puedes inscribirte después de 10 minutos del inicio de la clase'
      }
    }
  }

  return { valido: true }
}

const validarCancelacionClase = (classItem, esAdmin) => {
  if (esAdmin) return { valido: true }

  const horaActual = new Date()
  const horaClase = obtenerHoraClase(classItem)

  if (!horaClase) return { valido: true }

  if (esDiaPasado(horaClase)) {
    return {
      valido: false,
      mensaje: 'No puedes cancelar una clase de un día pasado'
    }
  }

  if (esHoy(horaClase)) {
    const diferenciaHoras = (horaClase - horaActual) / (1000 * 60 * 60)
    if (diferenciaHoras < 2) {
      return {
        valido: false,
        mensaje:
          'No puedes cancelar tu inscripción con menos de 2 horas de antelación'
      }
    }
  }

  return { valido: true }
}

const procesarInscripcion = async (usuario, clase, esAdmin) => {
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
      await usuario.populate('bonoActivo')
      const bono = usuario.bonoActivo

      if (!bono) {
        throw new Error('No se encontró el bono activo')
      }

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

      console.log(`=== INSCRIPCIÓN PROCESADA ===`)
      console.log(`Tipo sesión: ${tipoSesionUsada}`)
      console.log(`Bono utilizado: ${bonoUtilizado}`)
      console.log(`Sesiones restantes: ${bono.sesionesRestantes}`)
    } else if (puedeReservar.tipo === 'sesiones_libres') {
      await usuario.usarSesionLibre(`Clase: ${clase.nombre}`)
      tipoSesionUsada = 'sesiones_libres'

      console.log(`=== INSCRIPCIÓN PROCESADA ===`)
      console.log(`Tipo sesión: ${tipoSesionUsada}`)
      console.log(`Sesiones libres usadas: 1`)
    }
  } else {
    tipoSesionUsada = 'admin'
  }

  return { tipoSesionUsada, bonoUtilizado }
}

const procesarCancelacion = async (usuario, clase, inscripcion, esAdmin) => {
  if (esAdmin) return

  console.log('=== PROCESAR CANCELACIÓN ===')
  console.log('Inscripción encontrada:', inscripcion)
  console.log('Tipo de sesión:', inscripcion?.tipoSesion)
  console.log('Bono utilizado:', inscripcion?.bonoUtilizado)

  if (
    inscripcion &&
    inscripcion.tipoSesion === 'bono' &&
    inscripcion.bonoUtilizado
  ) {
    console.log('=== CANCELACIÓN DE BONO: Verificando vigencia ===')

    const bonoUtilizado = await Bono.findById(inscripcion.bonoUtilizado)

    if (bonoUtilizado) {
      console.log(
        `Bono encontrado: ${bonoUtilizado._id}, Estado: ${bonoUtilizado.estado}`
      )
      console.log(`Fecha fin del bono: ${bonoUtilizado.fechaFin}`)
      console.log(`Fecha actual: ${new Date()}`)

      const fechaFin = new Date(bonoUtilizado.fechaFin)
      fechaFin.setHours(23, 59, 59, 999)
      const estaExpiradoPorFecha = new Date() > fechaFin

      console.log(`¿Bono expirado por fecha?: ${estaExpiradoPorFecha}`)

      if (!estaExpiradoPorFecha) {
        console.log('✅ BONO VIGENTE: Devolviendo sesión al bono')

        if (bonoUtilizado.tipo !== 'Ilimitado') {
          bonoUtilizado.sesionesRestantes += 1
          await bonoUtilizado.save()

          await bonoUtilizado.actualizarEstado()

          console.log(
            `✅ Sesión devuelta al bono. Nuevas sesiones: ${bonoUtilizado.sesionesRestantes}`
          )

          if (bonoUtilizado.estado === 'activo' && !usuario.bonoActivo) {
            usuario.bonoActivo = bonoUtilizado._id
            await usuario.save()
            console.log('Usuario actualizado con bono reactivado')
          }
        } else {
          console.log(
            '✅ Bono ilimitado vigente - no se necesita devolver sesiones'
          )
        }

        inscripcion.sesionDevuelta = true
      } else {
        console.log('❌ BONO EXPIRADO: La sesión se pierde (no se devuelve)')
        inscripcion.sesionDevuelta = false
        console.log(
          '❌ Sesión perdida - el bono expiró y el usuario tuvo su tiempo para usarla'
        )
      }
    } else {
      console.log('❌ Bono no encontrado, sesión se pierde')
      if (inscripcion) inscripcion.sesionDevuelta = false
    }
  } else if (inscripcion && inscripcion.tipoSesion === 'sesiones_libres') {
    console.log(
      '=== CANCELACIÓN DE SESIONES LIBRES: Devolviendo a sesiones libres ==='
    )

    await usuario.añadirSesionesLibres(
      1,
      `Cancelación clase: ${clase.nombre}`,
      usuario._id
    )
    inscripcion.sesionDevuelta = true
    console.log('✅ Sesión libre devuelta')
  } else {
    console.log('=== SIN INFORMACIÓN ESPECÍFICA: No se devuelve nada ===')
    console.log('❌ Sin información de tipo de sesión - no se devuelve nada')
  }
}

exports.createClass = async (req, res) => {
  try {
    const classData = { ...req.body }

    if (classData.entrenador === '') {
      delete classData.entrenador
    }

    if (classData.fecha && classData.fecha.trim() !== '') {
      classData.esFechaEspecifica = true
    } else {
      classData.esFechaEspecifica = false
      classData.fecha = null
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'crossfit/clases'
        })
        classData.imagen = result.secure_url
        fs.unlinkSync(req.file.path)
      } catch (error) {
        console.error('Error al subir imagen a Cloudinary:', error)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    }

    const newClass = await Class.create(classData)

    res.status(201).json({
      success: true,
      message: 'Clase creada exitosamente',
      data: newClass
    })
  } catch (error) {
    console.error('Error al crear clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al crear la clase',
      error: error.message
    })
  }
}

exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate({
        path: 'inscritos',
        select: 'nombre email avatar rol',
        model: 'User'
      })
      .populate({
        path: 'entrenador',
        select: 'nombre email avatar',
        model: 'User'
      })

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    })
  } catch (error) {
    console.error('Error al obtener clases:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener las clases',
      error: error.message
    })
  }
}

exports.getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('inscritos', 'nombre email imagen rol')
      .populate('entrenador', 'nombre email imagen')

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: classItem
    })
  } catch (error) {
    console.error('Error al obtener clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener la clase',
      error: error.message
    })
  }
}

exports.updateClass = async (req, res) => {
  try {
    const classData = { ...req.body }

    if (classData.entrenador === '') {
      delete classData.entrenador
    }

    if (classData.fecha && classData.fecha.trim() !== '') {
      classData.esFechaEspecifica = true
    } else {
      classData.esFechaEspecifica = false
      classData.fecha = null
    }

    const currentClass = await Class.findById(req.params.id)
    if (!currentClass) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (req.file) {
      try {
        if (
          currentClass.imagen &&
          currentClass.imagen.includes('cloudinary.com')
        ) {
          const publicId = currentClass.imagen.split('/').pop().split('.')[0]
          await cloudinary.uploader.destroy(`crossfit/clases/${publicId}`)
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'crossfit/clases'
        })
        classData.imagen = result.secure_url
        fs.unlinkSync(req.file.path)
      } catch (error) {
        console.error('Error al subir imagen a Cloudinary:', error)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: error.message
        })
      }
    } else {
      classData.imagen = currentClass.imagen
    }

    classData.inscritos = currentClass.inscritos

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      classData,
      { new: true, runValidators: true }
    )
      .populate('inscritos', 'nombre email imagen rol')
      .populate('entrenador', 'nombre email imagen')

    res.status(200).json({
      success: true,
      message: 'Clase actualizada exitosamente',
      data: updatedClass
    })
  } catch (error) {
    console.error('Error al actualizar clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la clase',
      error: error.message
    })
  }
}

exports.deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (classItem.imagen && classItem.imagen.includes('cloudinary.com')) {
      try {
        const publicId = classItem.imagen.split('/').pop().split('.')[0]
        await cloudinary.uploader.destroy(`crossfit/clases/${publicId}`)
      } catch (error) {
        console.error('Error al eliminar imagen de Cloudinary:', error)
      }
    }

    await Class.deleteOne({ _id: classItem._id })

    res.status(200).json({
      success: true,
      message: 'Clase eliminada exitosamente',
      data: {}
    })
  } catch (error) {
    console.error('Error al eliminar clase:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la clase',
      error: error.message
    })
  }
}

exports.inscribirUsuarioClase = async (req, res) => {
  try {
    const { userId } = req.body || {}
    const { id: claseId } = req.params
    const userIdFinal = userId || req.user._id
    const esAdmin =
      req.user.rol === 'admin' ||
      req.user.rol === 'creador' ||
      req.user.rol === 'monitor'

    console.log('=== INSCRIBIR USUARIO EN CLASE ===')
    console.log('Usuario ID:', userIdFinal)
    console.log('Clase ID:', claseId)
    console.log('Es Admin:', esAdmin)

    const usuario = await User.findById(userIdFinal).populate('bonoActivo')
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const clase = await Class.findById(claseId)
    if (!clase) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    if (clase.inscritos.includes(userIdFinal)) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya está inscrito en esta clase'
      })
    }

    if (clase.inscritos.length >= clase.capacidadMaxima) {
      return res.status(400).json({
        success: false,
        message: 'La clase está llena'
      })
    }

    const validacionHorario = validarHorarioClase(clase, esAdmin)
    if (!validacionHorario.valido) {
      return res.status(400).json({
        success: false,
        message: validacionHorario.mensaje
      })
    }

    const { tipoSesionUsada, bonoUtilizado } = await procesarInscripcion(
      usuario,
      clase,
      esAdmin
    )

    if (!clase.historialInscripciones) {
      clase.historialInscripciones = []
    }

    const nuevaInscripcion = {
      usuario: userIdFinal,
      fechaInscripcion: new Date(),
      estado: 'activa',
      bonoUtilizado: bonoUtilizado,
      tipoSesion: tipoSesionUsada,
      sesionDevuelta: false
    }

    clase.historialInscripciones.push(nuevaInscripcion)
    clase.inscritos.push(userIdFinal)

    await clase.save()

    console.log('=== HISTORIAL GUARDADO ===')
    console.log('Nueva inscripción:', nuevaInscripcion)
    console.log(
      'Total inscripciones en historial:',
      clase.historialInscripciones.length
    )

    await clase.populate([
      {
        path: 'inscritos',
        select: 'nombre email avatar rol imagen'
      },
      {
        path: 'entrenador',
        select: 'nombre email avatar imagen'
      }
    ])

    res.status(200).json({
      success: true,
      message: 'Usuario inscrito correctamente',
      data: clase,
      tipoSesionUsada: tipoSesionUsada
    })
  } catch (error) {
    console.error('Error al inscribir usuario en clase:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Error al inscribir usuario en clase'
    })
  }
}

exports.cancelarUsuarioClase = async (req, res) => {
  try {
    const { userId } = req.body || {}
    const { id: claseId } = req.params
    const userIdFinal = userId || req.user._id
    const esAdmin =
      req.user.rol === 'admin' ||
      req.user.rol === 'creador' ||
      req.user.rol === 'monitor'

    console.log('=== BACKEND: CANCELAR INSCRIPCIÓN ===')
    console.log('Usuario ID:', userIdFinal)
    console.log('Clase ID:', claseId)
    console.log('Es Admin:', esAdmin)

    const usuario = await User.findById(userIdFinal).populate('bonoActivo')
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const clase = await Class.findById(claseId)
    if (!clase) {
      return res.status(404).json({
        success: false,
        message: 'Clase no encontrada'
      })
    }

    console.log('=== BACKEND: Estado inicial ===')
    console.log('Inscritos antes:', clase.inscritos.length)
    console.log('Usuario está inscrito:', clase.inscritos.includes(userIdFinal))

    if (!clase.inscritos.includes(userIdFinal)) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no está inscrito en esta clase'
      })
    }

    const validacionCancelacion = validarCancelacionClase(clase, esAdmin)
    if (!validacionCancelacion.valido) {
      return res.status(400).json({
        success: false,
        message: validacionCancelacion.mensaje
      })
    }

    console.log('=== BACKEND: BUSCANDO INSCRIPCIÓN EN HISTORIAL ===')
    console.log(
      'Total inscripciones en historial:',
      clase.historialInscripciones?.length || 0
    )

    if (!clase.historialInscripciones) {
      clase.historialInscripciones = []
    }

    let inscripcionIndex = -1
    for (let i = clase.historialInscripciones.length - 1; i >= 0; i--) {
      const inscripcion = clase.historialInscripciones[i]
      if (
        inscripcion.usuario.toString() === userIdFinal.toString() &&
        inscripcion.estado === 'activa'
      ) {
        inscripcionIndex = i
        break
      }
    }

    console.log(
      '=== BACKEND: Índice de inscripción encontrada:',
      inscripcionIndex
    )

    let inscripcion = null
    if (inscripcionIndex !== -1) {
      inscripcion = clase.historialInscripciones[inscripcionIndex]
      console.log('=== BACKEND: Inscripción encontrada:', inscripcion)

      inscripcion.estado = 'cancelada'
      inscripcion.fechaCancelacion = new Date()
    }

    await procesarCancelacion(usuario, clase, inscripcion, esAdmin)

    const inscritosAntes = clase.inscritos.length
    clase.inscritos = clase.inscritos.filter(
      (id) => id.toString() !== userIdFinal.toString()
    )
    const inscritosDespues = clase.inscritos.length

    console.log('=== BACKEND: Removiendo usuario ===')
    console.log('Inscritos antes de filtrar:', inscritosAntes)
    console.log('Inscritos después de filtrar:', inscritosDespues)
    console.log(
      'Usuario removido correctamente:',
      inscritosAntes > inscritosDespues
    )

    await clase.save()

    console.log('=== BACKEND: Clase guardada ===')

    await clase.populate([
      {
        path: 'inscritos',
        select: 'nombre email avatar rol imagen'
      },
      {
        path: 'entrenador',
        select: 'nombre email avatar imagen'
      }
    ])

    console.log('=== BACKEND: Clase después de populate ===')
    console.log('Inscritos finales:', clase.inscritos.length)
    console.log('=== BACKEND: CANCELACIÓN COMPLETADA ===')

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada correctamente',
      data: clase
    })
  } catch (error) {
    console.error('=== BACKEND: Error al cancelar inscripción ===', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar inscripción',
      error: error.message
    })
  }
}
