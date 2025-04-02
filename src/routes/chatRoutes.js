const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const { protect, authorize } = require('../middlewares/authMiddleware')
const Message = require('../models/Chat')

router.get('/messages', chatController.getAllMessages)

router.get('/messages/:id', chatController.getMessage)

router.put('/messages/:id', protect, chatController.updateMessage)

router.delete('/messages/:id', protect, chatController.deleteMessage)

router.delete('/messages', protect, authorize('admin'), async (req, res) => {
  try {
    await Message.deleteMany({})
    req.io.emit('chatHistory', [])
    res.json({
      success: true,
      message: 'Todos los mensajes han sido eliminados'
    })
  } catch (error) {
    console.error('Error al eliminar todos los mensajes:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar todos los mensajes'
    })
  }
})

module.exports = router
