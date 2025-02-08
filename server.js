require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const userRoutes = require('./routes/userRoutes')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware de seguridad
app.use(cors())
app.use(helmet())
app.use(express.json())

// Límite de solicitudes para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // Máximo de peticiones por IP
})
app.use(limiter)

// Rutas
app.use('/api/users', userRoutes)

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('🔥 Conectado a MongoDB')
    app.listen(PORT, () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    )
  })
  .catch((err) => console.error('Error al conectar con MongoDB:', err))
