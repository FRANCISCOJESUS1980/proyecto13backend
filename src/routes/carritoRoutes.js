const express = require('express')
const router = express.Router()
const Carrito = require('../models/Carrito')
const Producto = require('../models/Product')
const { protect } = require('../middlewares/authMiddleware')

router.get('/', protect, async (req, res) => {
  try {
    const carrito = await Carrito.findOne({ usuario: req.user._id })

    if (!carrito) {
      return res.status(200).json({
        success: true,
        data: { items: [] }
      })
    }

    res.status(200).json({
      success: true,
      data: { items: carrito.items }
    })
  } catch (error) {
    console.error('Error al obtener carrito:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el carrito',
      error: error.message
    })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'El formato de los items no es válido'
      })
    }

    let carrito = await Carrito.findOne({ usuario: req.user._id })

    if (carrito) {
      carrito.items = items
      carrito.fechaActualizacion = Date.now()
      await carrito.save()
    } else {
      carrito = new Carrito({
        usuario: req.user._id,
        items: items
      })
      await carrito.save()
    }

    res.status(200).json({
      success: true,
      data: { items: carrito.items }
    })
  } catch (error) {
    console.error('Error al guardar carrito:', error)
    res.status(500).json({
      success: false,
      message: 'Error al guardar el carrito',
      error: error.message
    })
  }
})

router.post('/producto', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto no proporcionado'
      })
    }

    const producto = await Producto.findById(productId)
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      })
    }

    let carrito = await Carrito.findOne({ usuario: req.user._id })

    if (!carrito) {
      carrito = new Carrito({
        usuario: req.user._id,
        items: []
      })
    }

    const itemIndex = carrito.items.findIndex(
      (item) => item._id.toString() === productId
    )

    if (itemIndex > -1) {
      carrito.items[itemIndex].quantity += quantity || 1
    } else {
      carrito.items.push({
        _id: productId,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen,
        marca: producto.marca,
        quantity: quantity || 1
      })
    }

    await carrito.save()

    res.status(200).json({
      success: true,
      data: { items: carrito.items }
    })
  } catch (error) {
    console.error('Error al añadir producto al carrito:', error)
    res.status(500).json({
      success: false,
      message: 'Error al añadir producto al carrito',
      error: error.message
    })
  }
})

router.put('/producto/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params
    const { quantity } = req.body

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad no válida'
      })
    }

    const carrito = await Carrito.findOne({ usuario: req.user._id })

    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      })
    }

    const itemIndex = carrito.items.findIndex(
      (item) => item._id.toString() === productId
    )

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en el carrito'
      })
    }

    carrito.items[itemIndex].quantity = quantity

    await carrito.save()

    res.status(200).json({
      success: true,
      data: { items: carrito.items }
    })
  } catch (error) {
    console.error('Error al actualizar cantidad del producto:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cantidad del producto',
      error: error.message
    })
  }
})

router.delete('/producto/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params

    const carrito = await Carrito.findOne({ usuario: req.user._id })

    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      })
    }

    carrito.items = carrito.items.filter(
      (item) => item._id.toString() !== productId
    )

    await carrito.save()

    res.status(200).json({
      success: true,
      data: { items: carrito.items }
    })
  } catch (error) {
    console.error('Error al eliminar producto del carrito:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto del carrito',
      error: error.message
    })
  }
})

router.delete('/', protect, async (req, res) => {
  try {
    const carrito = await Carrito.findOne({ usuario: req.user._id })

    if (!carrito) {
      return res.status(200).json({
        success: true,
        data: { items: [] }
      })
    }

    carrito.items = []
    await carrito.save()

    res.status(200).json({
      success: true,
      data: { items: [] }
    })
  } catch (error) {
    console.error('Error al vaciar el carrito:', error)
    res.status(500).json({
      success: false,
      message: 'Error al vaciar el carrito',
      error: error.message
    })
  }
})

module.exports = router
