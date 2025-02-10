const Product = require('../models/Product')

exports.getProducts = async (req, res) => {
  try {
    const { limit = 10, page = 1, sort = '-createdAt' } = req.query

    const options = {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      sort: sort,
      select: '-__v'
    }

    const products = await Product.find({ estado: 'activo' })
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)

    const total = await Product.countDocuments({ estado: 'activo' })

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: options.page,
        pages: Math.ceil(total / options.limit)
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los productos',
      error: error.message
    })
  }
}

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      data: product
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el producto',
      error: error.message
    })
  }
}

exports.createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body)
    await newProduct.save()

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Producto creado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear el producto',
      error: error.message
    })
  }
}

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      })
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Producto actualizado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el producto',
      error: error.message
    })
  }
}

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      })
    }

    await Product.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el producto',
      error: error.message
    })
  }
}

exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query
    const searchRegex = new RegExp(q, 'i')

    const products = await Product.find({
      estado: 'activo',
      $or: [
        { nombre: searchRegex },
        { descripcion: searchRegex },
        { categoria: searchRegex }
      ]
    })

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda de productos',
      error: error.message
    })
  }
}

exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoria } = req.params
    const products = await Product.find({
      categoria,
      estado: 'activo'
    })

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los productos por categoría',
      error: error.message
    })
  }
}

exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      })
    }

    product.estado = product.estado === 'activo' ? 'inactivo' : 'activo'
    await product.save()

    res.status(200).json({
      success: true,
      data: product,
      message: `Producto ${
        product.estado === 'activo' ? 'activado' : 'desactivado'
      } exitosamente`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del producto',
      error: error.message
    })
  }
}
