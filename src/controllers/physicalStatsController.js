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

      const latestStats = await PhysicalStats.findOne({ userId }).sort({
        fecha: -1
      })

      if (!latestStats) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron estadísticas para este usuario'
        })
      }

      res.status(200).json({
        success: true,
        data: latestStats
      })
    } catch (error) {
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
  createObjetivo: async (req, res) => {
    try {
      const userId = req.user._id
      const { tipo, medida, valorObjetivo, fechaObjetivo } = req.body

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

      const nuevoObjetivo = new Objetivo({
        userId,
        tipo,
        medida,
        valorInicial,
        valorObjetivo,
        fechaObjetivo: new Date(fechaObjetivo)
      })

      await nuevoObjetivo.save()

      res.status(201).json({
        success: true,
        data: nuevoObjetivo,
        message: 'Objetivo creado correctamente'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al crear objetivo',
        error: error.message
      })
    }
  },

  getObjetivos: async (req, res) => {
    try {
      const userId = req.user._id
      const { completado } = req.query

      const query = { userId }

      if (completado !== undefined) {
        query.completado = completado === 'true'
      }

      const objetivos = await Objetivo.find(query).sort({ fechaObjetivo: 1 })

      res.status(200).json({
        success: true,
        count: objetivos.length,
        data: objetivos
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener objetivos',
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
