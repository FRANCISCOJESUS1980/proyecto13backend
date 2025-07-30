const express = require('express')
const router = express.Router()
const Pedido = require('../models/Pedido')
const Producto = require('../models/Product')
const { protect } = require('../middlewares/authMiddleware')

let stripe
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.warn(
      '⚠️ STRIPE_SECRET_KEY no está configurada. Los pagos funcionarán en modo simulación.'
    )
  } else {
    stripe = require('stripe')(stripeKey)
  }
} catch (error) {
  console.error('Error al inicializar Stripe:', error)
}

router.post('/procesar', protect, async (req, res) => {
  try {
    const { items, total, payment } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron productos para el pedido'
      })
    }

    if (!total || isNaN(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El total del pedido es inválido'
      })
    }

    const userId = req.user._id

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto no proporcionado'
        })
      }

      const producto = await Producto.findById(item.productId)
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: `Producto no encontrado: ${item.productId}`
        })
      }

      if (producto.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${producto.nombre}`
        })
      }
    }

    let paymentIntentId = 'simulado-' + Date.now()
    let clientSecret = 'simulado-secret-' + Date.now()

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: 'eur',
          payment_method_types: ['card'],
          description: `Pedido CrossFit Box - Usuario ${userId}`,
          metadata: {
            userId: userId.toString()
          }
        })

        paymentIntentId = paymentIntent.id
        clientSecret = paymentIntent.client_secret
      } catch (stripeError) {
        console.error('Error de Stripe:', stripeError)
        return res.status(400).json({
          success: false,
          message: 'Error al procesar el pago con Stripe',
          error: stripeError.message
        })
      }
    } else {
    }

    const pedido = new Pedido({
      usuario: userId,
      productos: items.map((item) => ({
        producto: item.productId,
        cantidad: item.quantity,
        precio: item.price
      })),
      total: total,
      estado: 'completado',
      metodoPago: 'tarjeta',
      infoEnvio: {
        direccion: req.body.direccion || 'Recogida en tienda',
        ciudad: req.body.ciudad || '',
        codigoPostal: req.body.codigoPostal || '',
        pais: req.body.pais || ''
      },
      fechaCreacion: new Date()
    })

    await pedido.save()

    for (const item of items) {
      await Producto.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      })
    }

    res.status(200).json({
      success: true,
      message: 'Pago procesado correctamente',
      pedidoId: pedido._id,
      paymentIntentId: paymentIntentId,
      clientSecret: clientSecret
    })
  } catch (error) {
    console.error('Error al procesar el pago:', error)
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pago',
      error: error.message
    })
  }
})

router.get('/historial', protect, async (req, res) => {
  try {
    const pedidos = await Pedido.find({ usuario: req.user._id })
      .sort({ fechaCreacion: -1 })
      .populate('productos.producto', 'nombre imagen precio')

    res.status(200).json({
      success: true,
      data: pedidos
    })
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de pagos',
      error: error.message
    })
  }
})

router.get('/pedido/:id', protect, async (req, res) => {
  try {
    const pedido = await Pedido.findOne({
      _id: req.params.id,
      usuario: req.user._id
    }).populate('productos.producto')

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: pedido
    })
  } catch (error) {
    console.error('Error al obtener detalle del pedido:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del pedido',
      error: error.message
    })
  }
})

module.exports = router
