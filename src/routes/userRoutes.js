const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const upload = require('../config/multer')
const User = require('../models/User')
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

router.use((req, res, next) => {
  res.header(
    'Access-Control-Allow-Origin',
    'https://proyecto13backend.onrender.com/' /*'http://localhost:5173'*/
  )
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  next()
})

router.get('/entrenadores', async (req, res) => {
  try {
    const entrenadores = await User.find({
      rol: 'monitor'
    }).select('nombre email imagen rol')

    res.status(200).json({
      success: true,
      count: entrenadores.length,
      data: entrenadores
    })
  } catch (error) {
    console.error('Error al obtener entrenadores:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los entrenadores',
      error: error.message
    })
  }
})

router.get('/me', protect, (req, res) => {
  res.status(200).json({
    userId: req.user._id,
    nombre: req.user.nombre,
    email: req.user.email,
    rol: req.user.rol,
    imagen: req.user.imagen
  })
})

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

module.exports = router
