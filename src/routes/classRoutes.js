const express = require('express')
const router = express.Router()
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} = require('../controllers/classController')
const { protect, authorize } = require('../middlewares/authMiddleware')
const validateClassId = require('../middlewares/validateClassId')

router.get('/', getClasses)
router.get('/:id', getClassById)

router.use(protect)

router.post('/', authorize('monitor', 'admin'), createClass)
router.put('/:id', authorize('monitor', 'admin'), updateClass)
router.delete('/:id', authorize('monitor', 'admin'), deleteClass)

router.get('/:id', validateClassId, getClassById)
router.put('/:id', validateClassId, authorize('monitor', 'admin'), updateClass)
router.delete(
  '/:id',
  validateClassId,
  authorize('monitor', 'admin'),
  deleteClass
)

module.exports = router
