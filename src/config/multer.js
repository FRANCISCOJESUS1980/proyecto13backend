/*const multer = require('multer')
const path = require('path')
const cloudinary = require('./cloudinary')

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Formato de imagen no válido'), false)
  }
}

const upload = multer({
  storage,
  cloudinary,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
})

module.exports = upload*/
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Asegurarse de que el directorio uploads existe
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configurar el almacenamiento temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Sanitizar el nombre del archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

// Filtro para archivos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('El archivo debe ser una imagen'), false)
  }
}

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
})

module.exports = upload
