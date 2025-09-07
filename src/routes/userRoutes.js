const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const upload = require('../config/multer')
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
  verificarCodigo,
  getEntrenadores,
  getCurrentUser,
  solicitarRecuperacionPassword,
  verificarTokenRecuperacion,
  restablecerPassword
} = require('../controllers/userController')

router.get('/entrenadores', getEntrenadores)
router.get('/me', protect, getCurrentUser)

router.post('/register', upload.single('avatar'), registerUser)
router.post('/login', loginUser)
router.post('/verificar-codigo', verificarCodigo)

router.get('/profile', protect, getProfile)
router.put('/profile', protect, upload.single('avatar'), updateProfile)
router.put('/change-password', protect, changePassword)

router.get('/', protect, getAllUsers)
router.get('/:id', protect, getUserById)
router.put('/:id', protect, updateUser)
router.delete('/:id', protect, deleteUser)

router.post('/solicitar-recuperacion', solicitarRecuperacionPassword)
router.get('/verificar-token-recuperacion/:token', verificarTokenRecuperacion)
router.post('/restablecer-password', restablecerPassword)

module.exports = router
