const Message = require('../models/Chat')

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 })
      .select('text createdAt userId userName')
      .lean()

    res.json(messages)
  } catch (error) {
    console.error('Error al obtener mensajes:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes del chat'
    })
  }
}

const getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      })
    }

    res.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error('Error al obtener mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el mensaje'
    })
  }
}

const updateMessage = async (req, res) => {
  try {
    const { text } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El texto del mensaje es requerido'
      })
    }

    const message = await Message.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      })
    }

    const userId = req.user._id.toString()
    const userRole = req.user.rol

    if (message.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este mensaje'
      })
    }

    message.text = text.trim()
    await message.save()

    req.io.emit('messageUpdated', {
      _id: message._id,
      text: message.text,
      userId: message.userId,
      userName: message.userName,
      createdAt: message.createdAt
    })

    res.json({
      success: true,
      message: 'Mensaje actualizado correctamente',
      data: message
    })
  } catch (error) {
    console.error('Error al actualizar mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el mensaje'
    })
  }
}

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      })
    }

    const userId = req.user._id.toString()
    const userRole = req.user.rol

    if (message.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este mensaje'
      })
    }

    await Message.findByIdAndDelete(req.params.id)

    req.io.emit('messageDeleted', { _id: req.params.id })

    res.json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar mensaje:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el mensaje'
    })
  }
}

module.exports = {
  getAllMessages,
  getMessage,
  updateMessage,
  deleteMessage
}
