const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const { protect, authorize } = require('../middlewares/authMiddleware')

router.get('/messages', chatController.getAllMessages)
router.get('/messages/:id', chatController.getMessage)
router.put('/messages/:id', protect, chatController.updateMessage)
router.delete('/messages/:id', protect, chatController.deleteMessage)
router.delete(
  '/messages',
  protect,
  authorize('admin'),
  chatController.deleteAllMessages
)

module.exports = router
