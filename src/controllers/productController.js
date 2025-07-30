const Product = require('../models/Product')
const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier')

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'productos',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )

    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

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
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer)
        imageUrl = uploadResult.secure_url
      } catch (uploadError) {
        console.error('Error al subir imagen a Cloudinary:', uploadError)
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen',
          error: uploadError.message
        })
      }
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
    console.error('Error al crear producto:', error)
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
      try {
        if (product.imagen) {
          const urlParts = product.imagen.split('/')
          const publicIdWithExtension = urlParts[urlParts.length - 1]
          const publicId = `productos/${publicIdWithExtension.split('.')[0]}`

          await cloudinary.uploader.destroy(publicId)
        }

        const uploadResult = await uploadToCloudinary(req.file.buffer)
        imageUrl = uploadResult.secure_url
      } catch (uploadError) {
        console.error('Error al actualizar imagen en Cloudinary:', uploadError)
        return res.status(500).json({
          success: false,
          message: 'Error al actualizar la imagen',
          error: uploadError.message
        })
      }
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

    if (product.imagen) {
      try {
        const urlParts = product.imagen.split('/')
        const publicIdWithExtension = urlParts[urlParts.length - 1]
        const publicId = `productos/${publicIdWithExtension.split('.')[0]}`

        await cloudinary.uploader.destroy(publicId)
      } catch (cloudinaryError) {
        console.error(
          'Error al eliminar imagen de Cloudinary:',
          cloudinaryError
        )
      }
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
