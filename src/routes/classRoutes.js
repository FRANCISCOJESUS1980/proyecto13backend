const express = require('express')
const router = express.Router()
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  inscribirUsuario,
  cancelarUsuario,
  inscribirUsuarioAdmin,
  cancelarUsuarioAdmin
} = require('../controllers/classController')
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

router.post('/:id/inscribir', inscribirUsuario)
router.post('/:id/cancelar', cancelarUsuario)
router.post('/:id/inscribir-usuario', inscribirUsuarioAdmin)
router.post('/:id/cancelar-usuario', cancelarUsuarioAdmin)

module.exports = router
