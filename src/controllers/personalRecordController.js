const PersonalRecord = require('../models/PersonalRecord')
const mongoose = require('mongoose')

exports.getPersonalRecords = async (req, res) => {
  try {
    const records = await PersonalRecord.find({ userId: req.user.id })
      .sort({ fecha: -1 })
      .lean()

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    })
  } catch (error) {
    console.error('Error al obtener marcas personales:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener las marcas personales'
    })
  }
}

exports.getPersonalRecord = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca personal inválido'
      })
    }

    const record = await PersonalRecord.findOne({
      _id: id,
      userId: req.user.id
    }).lean()

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Marca personal no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Error al obtener marca personal:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener la marca personal'
    })
  }
}

exports.createPersonalRecord = async (req, res) => {
  try {
    const { ejercicio, peso, repeticiones, fecha, categoria } = req.body

    if (!ejercicio || !peso || !fecha) {
      return res.status(400).json({
        success: false,
        error: 'Por favor proporciona ejercicio, peso y fecha'
      })
    }

    const newRecord = await PersonalRecord.create({
      ejercicio,
      peso,
      repeticiones: repeticiones || '1',
      fecha,
      categoria: categoria || 'Levantamiento de Potencia',
      userId: req.user.id
    })

    res.status(201).json({
      success: true,
      data: newRecord
    })
  } catch (error) {
    console.error('Error al crear marca personal:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message)
      return res.status(400).json({
        success: false,
        error: messages
      })
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear la marca personal'
    })
  }
}

exports.updatePersonalRecord = async (req, res) => {
  try {
    const { id } = req.params
    const { ejercicio, peso, repeticiones, fecha, categoria } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca personal inválido'
      })
    }

    if (!ejercicio || !peso || !fecha) {
      return res.status(400).json({
        success: false,
        error: 'Por favor proporciona ejercicio, peso y fecha'
      })
    }

    const existingRecord = await PersonalRecord.findOne({
      _id: id,
      userId: req.user.id
    })

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Marca personal no encontrada'
      })
    }

    const updatedRecord = await PersonalRecord.findByIdAndUpdate(
      id,
      {
        ejercicio,
        peso,
        repeticiones: repeticiones || '1',
        fecha,
        categoria: categoria || 'Levantamiento de Potencia'
      },
      { new: true, runValidators: true }
    ).lean()

    res.status(200).json({
      success: true,
      data: updatedRecord
    })
  } catch (error) {
    console.error('Error al actualizar marca personal:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message)
      return res.status(400).json({
        success: false,
        error: messages
      })
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar la marca personal'
    })
  }
}

exports.deletePersonalRecord = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de marca personal inválido'
      })
    }

    const record = await PersonalRecord.findOne({
      _id: id,
      userId: req.user.id
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Marca personal no encontrada'
      })
    }

    await PersonalRecord.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      data: {}
    })
  } catch (error) {
    console.error('Error al eliminar marca personal:', error)
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la marca personal'
    })
  }
}

exports.getPersonalRecordStats = async (req, res) => {
  try {
    const { ejercicio } = req.query

    if (!ejercicio) {
      return res.status(400).json({
        success: false,
        error: 'Por favor proporciona el nombre del ejercicio'
      })
    }

    const records = await PersonalRecord.find({
      userId: req.user.id,
      ejercicio
    })
      .sort({ fecha: 1 })
      .select('peso repeticiones fecha')
      .lean()

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de marcas personales'
    })
  }
}

exports.getUniqueExercises = async (req, res) => {
  try {
    const exercises = await PersonalRecord.distinct('ejercicio', {
      userId: req.user.id
    })

    res.status(200).json({
      success: true,
      count: exercises.length,
      data: exercises
    })
  } catch (error) {
    console.error('Error al obtener ejercicios únicos:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener la lista de ejercicios'
    })
  }
}

exports.testRoute = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ruta de prueba de personal-records funcionando correctamente',
    timestamp: new Date().toISOString()
  })
}
