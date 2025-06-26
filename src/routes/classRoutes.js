const express = require('express')
const router = express.Router()
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} = require('../controllers/classController')
const ClassService = require('../services/classService')
const { protect, authorize } = require('../middlewares/authMiddleware')
const validateClassId = require('../middlewares/validateClassId')
const upload = require('../config/multer')

router.get('/', getClasses)
router.get('/:id', validateClassId, getClassById)

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

router.post('/:id/inscribir', async (req, res) => {
  try {
    const userId = req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const resultado = await ClassService.inscribirUsuario(
      req.params.id,
      userId,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción exitosa',
      data: resultado.clase,
      tipoSesionUsada: resultado.tipoSesionUsada
    })
  } catch (error) {
    console.error('Error en inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
})

router.post('/:id/cancelar', async (req, res) => {
  try {
    const userId = req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const clase = await ClassService.cancelarUsuario(
      req.params.id,
      userId,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada exitosamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
})

router.post('/:id/inscribir-usuario', async (req, res) => {
  try {
    const { userId } = req.body
    const userIdFinal = userId || req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const resultado = await ClassService.inscribirUsuario(
      req.params.id,
      userIdFinal,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Usuario inscrito correctamente',
      data: resultado.clase,
      tipoSesionUsada: resultado.tipoSesionUsada
    })
  } catch (error) {
    console.error('Error al inscribir usuario:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
})

router.post('/:id/cancelar-usuario', async (req, res) => {
  try {
    const { userId } = req.body
    const userIdFinal = userId || req.user._id
    const esAdmin = ['admin', 'monitor', 'creador'].includes(req.user.rol)

    const clase = await ClassService.cancelarUsuario(
      req.params.id,
      userIdFinal,
      esAdmin
    )

    res.status(200).json({
      success: true,
      message: 'Inscripción cancelada correctamente',
      data: clase
    })
  } catch (error) {
    console.error('Error al cancelar inscripción:', error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
})

module.exports = router
