require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const connectDB = require('./src/config/db')
const path = require('path')
const fs = require('fs')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')
const Message = require('./src/models/Chat')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

connectDB()

app.use('/api/auth', require('./src/routes/userRoutes'))
app.use('/api/users', require('./src/routes/userRoutes'))
app.use('/api/classes', require('./src/routes/classRoutes'))
app.use('/api', require('./src/routes/productRoutes'))
app.use('/api/medical-info', require('./src/routes/medicalinfoRoutes'))

app.get('/api/chat/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 })
      .select('text createdAt')
      .lean()

    res.json(messages)
  } catch (error) {
    console.error('Error al obtener mensajes:', error)
    res.status(500).json({ message: 'Error al obtener mensajes del chat' })
  }
})

io.on('connection', async (socket) => {
  console.log('🟢 Nuevo usuario conectado: ', socket.id)

  try {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    await Message.deleteMany({ createdAt: { $lt: oneMonthAgo } })

    const messages = await Message.find()
      .sort({ createdAt: 1 })
      .select('text createdAt')
      .lean()

    socket.emit('chatHistory', messages)

    socket.on('chatMessage', async (message) => {
      try {
        if (!message || typeof message !== 'string' || !message.trim()) {
          throw new Error('Mensaje inválido')
        }

        const newMessage = new Message({ text: message.trim() })
        await newMessage.save()

        io.emit('chatMessage', {
          _id: newMessage._id,
          text: newMessage.text,
          createdAt: newMessage.createdAt
        })
      } catch (error) {
        console.error('Error al guardar mensaje:', error)
        socket.emit('error', { message: 'Error al guardar el mensaje' })
      }
    })

    socket.on('disconnect', () => {
      console.log('🔴 Usuario desconectado', socket.id)
    })
  } catch (error) {
    console.error('Error en la conexión del socket:', error)
    socket.emit('error', { message: 'Error en la conexión' })
  }
})

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
)

module.exports = app
