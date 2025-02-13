const multer = require('multer')
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

module.exports = upload
