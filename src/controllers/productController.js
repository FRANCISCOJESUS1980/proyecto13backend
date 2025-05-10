const Product = require('../models/Product')
const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier')

exports.getProducts = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      sort = '-createdAt',
      estado = 'activo'
    } = req.query

    const options = {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      sort: sort,
      select: '-__v'
    }

    const filter = { estado }

    if (req.query.categoria) {
      filter.categoria = req.query.categoria
    }

    const products = await Product.find(filter)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)

    const total = await Product.countDocuments(filter)

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

exports.getProductsAdmin = async (req, res) => {
  try {
    console.log('getProductsAdmin llamado')

    const { limit = 10, page = 1, sort = '-createdAt' } = req.query

    const options = {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      sort: sort,
      select: '-__v'
    }

    const filter = {}

    if (req.query.categoria) {
      filter.categoria = req.query.categoria
    }

    console.log('Filtro:', filter)

    const products = await Product.find(filter)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)

    const total = await Product.countDocuments(filter)

    console.log(`Encontrados ${products.length} productos`)

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
    console.error('Error en getProductsAdmin:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener los productos',
      error: error.message
    })
  }
}

exports.searchProducts = async (req, res) => {
  try {
    const { q, estado = 'activo' } = req.query
    const searchRegex = new RegExp(q, 'i')

    const products = await Product.find({
      estado,
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

exports.searchProductsAdmin = async (req, res) => {
  try {
    const { q } = req.query
    const searchRegex = new RegExp(q, 'i')

    const products = await Product.find({
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
    let imageUrl = ''

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'productos'
      })
      imageUrl = uploadResult.secure_url
    }

    const newProduct = new Product({
      ...req.body,
      imagen: imageUrl
    })

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

    let imageUrl = product.imagen

    if (req.file) {
      if (product.imagen) {
        const publicId = product.imagen.split('/').pop().split('.')[0]
        await cloudinary.uploader.destroy(`productos/${publicId}`)
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'productos'
      })
      imageUrl = uploadResult.secure_url
    }

    const updateData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      precio: Number(req.body.precio),
      categoria: req.body.categoria,
      stock: Number(req.body.stock),
      marca: req.body.marca,
      estado: req.body.estado,
      destacado: req.body.destacado === 'true',
      imagen: imageUrl
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Producto actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error al actualizar producto:', error)
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
