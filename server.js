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
const physicalStatsRoutes = require('./src/routes/physicalStatsRoutes')
const app = express()
const server = http.createServer(app)
const consentimientoRoutes = require('./src/routes/consentimientoRoutes')
const chatRoutes = require('./src/routes/chatRoutes')
const mensajesPrivadosRoutes = require('./src/routes/mensajesPrivadosRoutes')
const pagosRoutes = require('./src/routes/pagosRoutes')
const carritoRoutes = require('./src/routes/carritoRoutes')
const bonoRoutes = require('./src/routes/bonoRoutes')
const sesionesLibresRoutes = require('./src/routes/sesionesLibresRoutes')

const io = new Server(server, {
  cors: {
    origin:
      'https://proyecto13fronted.vercel.app' /*  'http://localhost:5173'*/,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(
  cors({
    origin: 'https://proyecto13fronted.vercel.app' /* 'http://localhost:5173'*/,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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

app.use('/api/bonos', require('./src/routes/bonoRoutes'))

connectDB()

app.use('/api/auth', require('./src/routes/userRoutes'))
app.use('/api/users', require('./src/routes/userRoutes'))
app.use('/api/classes', require('./src/routes/classRoutes'))
app.use('/api', require('./src/routes/productRoutes'))
app.use('/api/medical-info', require('./src/routes/medicalinfoRoutes'))
app.use('/api/physical', physicalStatsRoutes)
app.use('/api/personal-records', require('./src/routes/personalRecordRoutes'))
app.use('/api/consentimientos', consentimientoRoutes)
app.use('/api/mensajes-privados', mensajesPrivadosRoutes)
app.use('/api/pagos', pagosRoutes)
app.use('/api/carrito', carritoRoutes)
app.use('/api/bonos', bonoRoutes)
app.use('/api/sesiones-libres', sesionesLibresRoutes)

app.use((req, res, next) => {
  req.io = io
  next()
})
app.use('/api/chat', chatRoutes)

app.get('/api/chat/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 })
      .select('text createdAt userId userName')
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
      .select('text createdAt userId userName')
      .lean()

    socket.emit('chatHistory', messages)

    socket.on('chatMessage', async (messageData) => {
      try {
        let newMessage

        if (typeof messageData === 'string') {
          if (!messageData.trim()) {
            throw new Error('Mensaje inválido')
          }
          newMessage = new Message({ text: messageData.trim() })
        } else if (typeof messageData === 'object' && messageData !== null) {
          if (!messageData.text || !messageData.text.trim()) {
            throw new Error('Mensaje inválido')
          }
          newMessage = new Message({
            text: messageData.text.trim(),
            userId: messageData.userId,
            userName: messageData.userName
          })
        } else {
          throw new Error('Formato de mensaje inválido')
        }

        await newMessage.save()

        io.emit('chatMessage', {
          _id: newMessage._id,
          text: newMessage.text,
          userId: newMessage.userId,
          userName: newMessage.userName,
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
