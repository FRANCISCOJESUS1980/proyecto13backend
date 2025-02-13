const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verificarCodigo
} = require('../controllers/userController')

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/verificar-codigo', verificarCodigo)

router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)
router.put('/change-password', protect, changePassword)
router.get('/', protect, getAllUsers)
router.get('/:id', protect, getUserById)
router.put('/:id', protect, updateUser)
router.delete('/:id', protect, deleteUser)

module.exports = router
