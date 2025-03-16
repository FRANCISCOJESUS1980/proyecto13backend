const express = require('express')
const {
  physicalStatsController,
  objetivosController
} = require('../controllers/physicalStatsController')
const { protect } = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/stats', protect, physicalStatsController.saveStats)
router.get('/stats/history', protect, physicalStatsController.getStatsHistory)
router.get('/stats/latest', protect, physicalStatsController.getLatestStats)
router.get('/stats/trends/:medida', protect, physicalStatsController.getTrends)

router.post('/objetivos', protect, objetivosController.createObjetivo)
router.get('/objetivos', protect, objetivosController.getObjetivos)

module.exports = router
