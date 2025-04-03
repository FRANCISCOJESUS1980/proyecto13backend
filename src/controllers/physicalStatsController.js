const { PhysicalStats, Objetivo } = require('../models/PhysicalStats')

const physicalStatsController = {
  saveStats: async (req, res) => {
    try {
      const userId = req.user._id
      const medidas = req.body

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const existingStats = await PhysicalStats.findOne({
        userId,
        fecha: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      })

      let result

      if (existingStats) {
        existingStats.medidas = medidas

        if (medidas.altura && medidas.peso) {
          const alturaMetros = medidas.altura / 100
          existingStats.imc = (
            medidas.peso /
            (alturaMetros * alturaMetros)
          ).toFixed(2)
        }

        result = await existingStats.save()
      } else {
        const newStats = new PhysicalStats({
          userId,
          medidas
        })

        result = await newStats.save()
      }

      await actualizarProgresoObjetivos(userId)

      res.status(200).json({
        success: true,
        data: result,
        message: existingStats
          ? 'Estadísticas actualizadas correctamente'
          : 'Estadísticas guardadas correctamente'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al guardar estadísticas',
        error: error.message
      })
    }
  },

  getStatsHistory: async (req, res) => {
    try {
      const userId = req.user._id
      const { startDate, endDate } = req.query

      const query = { userId }

      if (startDate && endDate) {
        query.fecha = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }

      const stats = await PhysicalStats.find(query).sort({ fecha: -1 })

      res.status(200).json({
        success: true,
        count: stats.length,
        data: stats
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial',
        error: error.message
      })
    }
  },

  getLatestStats: async (req, res) => {
    try {
      const userId = req.user._id
      console.log('Obteniendo últimas estadísticas para el usuario:', userId)

      const latestStats = await PhysicalStats.findOne({ userId }).sort({
        fecha: -1
      })

      if (!latestStats) {
        console.log('No se encontraron estadísticas para el usuario:', userId)
        return res.status(404).json({
          success: false,
          message: 'No se encontraron estadísticas para este usuario'
        })
      }

      console.log('Estadísticas encontradas:', latestStats.medidas)
      res.status(200).json({
        success: true,
        data: latestStats
      })
    } catch (error) {
      console.error('Error al obtener estadísticas recientes:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas recientes',
        error: error.message
      })
    }
  },

  getTrends: async (req, res) => {
    try {
      const userId = req.user._id
      const { medida } = req.params

      const stats = await PhysicalStats.find({ userId })
        .sort({ fecha: 1 })
        .select(`medidas.${medida} fecha`)

      if (stats.length < 2) {
        return res.status(200).json({
          success: true,
          message:
            'Se necesitan al menos dos mediciones para calcular tendencias',
          data: {
            tendencia: 'neutral',
            valores: stats
          }
        })
      }

      const primerValor = stats[0].medidas[medida]
      const ultimoValor = stats[stats.length - 1].medidas[medida]
      const diferencia = ultimoValor - primerValor

      let tendencia = 'neutral'
      if (diferencia > 0) tendencia = 'aumento'
      if (diferencia < 0) tendencia = 'disminución'

      const diasTranscurridos = Math.ceil(
        (new Date(stats[stats.length - 1].fecha) - new Date(stats[0].fecha)) /
          (1000 * 60 * 60 * 24)
      )

      const tasaCambio =
        diasTranscurridos > 0 ? diferencia / diasTranscurridos : 0

      res.status(200).json({
        success: true,
        data: {
          tendencia,
          diferencia,
          tasaCambio: tasaCambio.toFixed(2),
          unidad:
            medida === 'peso'
              ? 'kg/día'
              : medida === 'altura'
              ? 'cm/día'
              : medida === 'grasa' || medida === 'musculo'
              ? '%/día'
              : 'cm/día',
          valores: stats.map((s) => ({
            fecha: s.fecha,
            valor: s.medidas[medida]
          }))
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al calcular tendencias',
        error: error.message
      })
    }
  }
}

const objetivosController = {
  getObjetivos: async (req, res) => {
    try {
      const userId = req.user._id
      console.log('Obteniendo objetivos para el usuario:', userId)

      const { completado } = req.query

      const query = { userId }

      if (completado !== undefined) {
        query.completado = completado === 'true'
      }

      const objetivos = await Objetivo.find(query).sort({ fechaObjetivo: 1 })
      console.log('Objetivos encontrados:', objetivos.length)

      res.status(200).json({
        success: true,
        count: objetivos.length,
        data: objetivos
      })
    } catch (error) {
      console.error('Error al obtener objetivos:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener objetivos',
        error: error.message
      })
    }
  },

  createObjetivo: async (req, res) => {
    try {
      const userId = req.user._id
      const { tipo, medida, valorObjetivo, fechaObjetivo } = req.body

      console.log('Datos recibidos en el servidor:', {
        userId,
        tipo,
        medida,
        valorObjetivo,
        fechaObjetivo
      })

      const latestStats = await PhysicalStats.findOne({ userId }).sort({
        fecha: -1
      })

      if (!latestStats) {
        return res.status(400).json({
          success: false,
          message:
            'Debes registrar tus medidas actuales antes de crear un objetivo'
        })
      }

      const valorInicial = latestStats.medidas[medida]

      if (valorInicial === undefined || valorInicial === null) {
        return res.status(400).json({
          success: false,
          message: `No se encontró un valor inicial para la medida "${medida}". Por favor, registra esta medida primero.`
        })
      }

      const nuevoObjetivo = new Objetivo({
        userId,
        tipo,
        medida,
        valorInicial,
        valorObjetivo,
        fechaObjetivo: new Date(fechaObjetivo)
      })

      await nuevoObjetivo.save()
      console.log('Objetivo guardado en la base de datos:', nuevoObjetivo)

      res.status(201).json({
        success: true,
        data: nuevoObjetivo,
        message: 'Objetivo creado correctamente'
      })
    } catch (error) {
      console.error('Error al crear objetivo:', error)
      res.status(500).json({
        success: false,
        message: 'Error al crear objetivo',
        error: error.message
      })
    }
  },

  deleteObjetivo: async (req, res) => {
    try {
      const userId = req.user._id
      const { objetivoId } = req.params

      console.log(
        `Intentando eliminar objetivo ${objetivoId} para el usuario ${userId}`
      )

      const objetivo = await Objetivo.findOne({
        _id: objetivoId,
        userId: userId
      })

      if (!objetivo) {
        console.log(
          `Objetivo ${objetivoId} no encontrado o no pertenece al usuario ${userId}`
        )
        return res.status(404).json({
          success: false,
          message: 'Objetivo no encontrado o no tienes permiso para eliminarlo'
        })
      }

      await Objetivo.findByIdAndDelete(objetivoId)
      console.log(`Objetivo ${objetivoId} eliminado correctamente`)

      res.status(200).json({
        success: true,
        message: 'Objetivo eliminado correctamente'
      })
    } catch (error) {
      console.error('Error al eliminar objetivo:', error)
      res.status(500).json({
        success: false,
        message: 'Error al eliminar objetivo',
        error: error.message
      })
    }
  }
}

async function actualizarProgresoObjetivos(userId) {
  try {
    const objetivos = await Objetivo.find({
      userId,
      completado: false
    })

    if (objetivos.length === 0) return

    const latestStats = await PhysicalStats.findOne({ userId }).sort({
      fecha: -1
    })

    if (!latestStats) return

    for (const objetivo of objetivos) {
      const valorActual = latestStats.medidas[objetivo.medida]
      const diferenciaTotalNecesaria =
        objetivo.valorObjetivo - objetivo.valorInicial
      const diferenciaActual = valorActual - objetivo.valorInicial

      let progreso = 0
      if (diferenciaTotalNecesaria !== 0) {
        progreso = (diferenciaActual / diferenciaTotalNecesaria) * 100

        progreso = Math.max(0, Math.min(100, progreso))
      }

      const completado = progreso >= 100

      await Objetivo.findByIdAndUpdate(objetivo._id, {
        progreso,
        completado
      })
    }
  } catch (error) {
    console.error('Error al actualizar progreso de objetivos:', error)
  }
}

module.exports = { physicalStatsController, objetivosController }
