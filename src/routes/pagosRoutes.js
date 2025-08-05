const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const pagosController = require('../controllers/pagosController')

router.post('/procesar', protect, pagosController.procesarPago)
router.get('/historial', protect, pagosController.obtenerHistorial)
router.get('/pedido/:id', protect, pagosController.obtenerPedido)

module.exports = router
