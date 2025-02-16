require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const connectDB = require('./src/config/db')
const userRoutes = require('./src/routes/userRoutes')
const path = require('path')
const fs = require('fs')

const app = express()

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})
app.use(limiter)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

connectDB()

app.use('/api/users', userRoutes)

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`))

module.exports = app
