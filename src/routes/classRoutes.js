const express = require('express')
const router = express.Router()
const Class = require('../models/Class')
const User = require('../models/User')
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  cancelarUsuarioClase,
  inscribirUsuarioClase
} = require('../controllers/classController')
const { protect, authorize } = require('../middlewares/authMiddleware')
const validateClassId = require('../middlewares/validateClassId')
const upload = require('../config/multer')

function obtenerHoraClase(classItem) {
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
    fechaClase.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0, 0)

    return fechaClase
  } catch (error) {
    console.error('Error al obtener hora de clase:', error)
    return null
  }
}

function obtenerFechaPorDiaSemana(diaSemana) {
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

function esHoy(fecha) {
  const hoy = new Date()
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  )
}

function esDiaPasado(fecha) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaComparar = new Date(fecha)
  fechaComparar.setHours(0, 0, 0, 0)
  return fechaComparar < hoy
}

router.get('/', getClasses)
router.get('/:id', validateClassId, getClassById)
router.get('/me', protect, (req, res) => {
  res.status(200).json({ userId: req.user._id })
})

router.use(protect)

router.post(
  '/',
  authorize('monitor', 'admin'),
  upload.single('imagen'),
  createClass
)

router.put(
  '/:id',
  validateClassId,
  authorize('monitor', 'admin'),
  upload.single('imagen'),
  updateClass
)

router.delete(
  '/:id',
  validateClassId,
  authorize('monitor', 'admin'),
  deleteClass
)

router.post('/:id/inscribir', protect, async (req, res) => {
  try {
    let classItem = await Class.findById(req.params.id)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    if (!classItem) {
      return res
        .status(404)
        .json({ success: false, message: 'Clase no encontrada' })
    }

    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'monitor' &&
      req.user.rol !== 'creador'
    ) {
      const horaActual = new Date()
      const horaClase = obtenerHoraClase(classItem)

      if (horaClase) {
        if (esDiaPasado(horaClase)) {
          return res.status(400).json({
            success: false,
            message: 'No puedes inscribirte a una clase de un día pasado'
          })
        }

        if (esHoy(horaClase)) {
          const diferenciaMinutos = (horaActual - horaClase) / (1000 * 60)

          if (diferenciaMinutos > 10) {
            return res.status(400).json({
              success: false,
              message:
                'No puedes inscribirte después de 10 minutos del inicio de la clase'
            })
          }
        }
      }

      const usuario = await User.findById(req.user._id).populate('bonoActivo')

      if (!usuario.bonoActivo) {
        return res.status(400).json({
          success: false,
          message: 'No tienes un bono activo para inscribirte a clases'
        })
      }

      const bono = usuario.bonoActivo

      if (bono.estado !== 'activo') {
        return res.status(400).json({
          success: false,
          message: `Tu bono está ${bono.estado}. Contacta con administración.`
        })
      }

      if (new Date() > new Date(bono.fechaFin)) {
        return res.status(400).json({
          success: false,
          message:
            'Tu bono ha expirado. Contacta con administración para renovarlo.'
        })
      }

      if (bono.tipo !== 'Ilimitado' && bono.sesionesRestantes <= 0) {
        return res.status(400).json({
          success: false,
          message:
            'Has agotado todas tus sesiones. Contacta con administración para añadir más.'
        })
      }
    }

    if (classItem.inscritos.length >= classItem.capacidadMaxima) {
      return res
        .status(400)
        .json({ success: false, message: 'La clase está llena' })
    }

    const userId = req.user._id

    if (
      classItem.inscritos.some(
        (inscrito) => inscrito._id.toString() === userId.toString()
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Ya estás inscrito en esta clase' })
    }

    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'monitor' &&
      req.user.rol !== 'creador'
    ) {
      const usuario = await User.findById(userId).populate('bonoActivo')

      if (usuario.bonoActivo && usuario.bonoActivo.tipo !== 'Ilimitado') {
        usuario.bonoActivo.sesionesRestantes -= 1
        await usuario.bonoActivo.save()
      }

      classItem.historialInscripciones.push({
        usuario: userId,
        fechaInscripcion: new Date(),
        estado: 'activa',
        bonoUtilizado: usuario.bonoActivo ? usuario.bonoActivo._id : null
      })
    } else {
      classItem.historialInscripciones.push({
        usuario: userId,
        fechaInscripcion: new Date(),
        estado: 'activa'
      })
    }

    classItem.inscritos.push(userId)
    await classItem.save()

    classItem = await Class.findById(classItem._id)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    res.status(200).json({
      success: true,
      message: 'Inscripción exitosa',
      data: classItem
    })
  } catch (error) {
    console.error('Error en inscripción:', error)
    res.status(500).json({
      success: false,
      message: 'Error al inscribirse',
      error: error.message
    })
  }
})

router.post('/:id/cancelar', protect, async (req, res) => {
  try {
    let classItem = await Class.findById(req.params.id)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    if (!classItem) {
      return res
        .status(404)
        .json({ success: false, message: 'Clase no encontrada' })
    }

    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'monitor' &&
      req.user.rol !== 'creador'
    ) {
      const horaActual = new Date()
      const horaClase = obtenerHoraClase(classItem)

      if (horaClase) {
        if (esDiaPasado(horaClase)) {
          return res.status(400).json({
            success: false,
            message: 'No puedes cancelar una clase de un día pasado'
          })
        }

        if (esHoy(horaClase)) {
          const diferenciaHoras = (horaClase - horaActual) / (1000 * 60 * 60)

          if (diferenciaHoras < 2) {
            return res.status(400).json({
              success: false,
              message:
                'No puedes cancelar tu inscripción con menos de 2 horas de antelación'
            })
          }
        }
      }
    }

    const userId = req.user._id

    const inscritoIndex = classItem.inscritos.findIndex(
      (inscrito) => inscrito._id.toString() === userId.toString()
    )

    if (inscritoIndex === -1) {
      return res
        .status(400)
        .json({ success: false, message: 'No estás inscrito en esta clase' })
    }

    const inscripcionIndex = classItem.historialInscripciones.findIndex(
      (inscripcion) =>
        inscripcion.usuario.toString() === userId.toString() &&
        inscripcion.estado === 'activa'
    )

    if (inscripcionIndex !== -1) {
      const inscripcion = classItem.historialInscripciones[inscripcionIndex]
      inscripcion.estado = 'cancelada'
      inscripcion.fechaCancelacion = new Date()

      if (
        req.user.rol !== 'admin' &&
        req.user.rol !== 'monitor' &&
        req.user.rol !== 'creador' &&
        inscripcion.bonoUtilizado
      ) {
        const usuario = await User.findById(userId).populate('bonoActivo')

        if (
          usuario.bonoActivo &&
          usuario.bonoActivo._id.toString() ===
            inscripcion.bonoUtilizado.toString() &&
          usuario.bonoActivo.estado === 'activo' &&
          usuario.bonoActivo.tipo !== 'Ilimitado'
        ) {
          usuario.bonoActivo.sesionesRestantes += 1
          await usuario.bonoActivo.save()
          inscripcion.sesionDevuelta = true
        }
      }
    }

    classItem.inscritos = classItem.inscritos.filter(
      (inscrito) => inscrito._id.toString() !== userId.toString()
    )

    await classItem.save()

    classItem = await Class.findById(classItem._id)
      .populate('inscritos', 'nombre email avatar rol')
      .populate('entrenador', 'nombre email avatar')

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada exitosamente',
      data: classItem
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la inscripción',
      error: error.message
    })
  }
})

router.post('/:id/inscribir-usuario', protect, inscribirUsuarioClase)
router.post('/:id/cancelar-usuario', protect, cancelarUsuarioClase)

module.exports = router
