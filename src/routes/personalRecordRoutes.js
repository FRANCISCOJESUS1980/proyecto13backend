const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const {
  getPersonalRecords,
  getPersonalRecord,
  createPersonalRecord,
  updatePersonalRecord,
  deletePersonalRecord,
  getPersonalRecordStats,
  getUniqueExercises,
  testRoute
} = require('../controllers/personalRecordController')

router.get('/test', testRoute)

router.use(protect)

router.get('/exercises', getUniqueExercises)

router.get('/stats', getPersonalRecordStats)

router.route('/').get(getPersonalRecords).post(createPersonalRecord)

router
  .route('/:id')
  .get(getPersonalRecord)
  .put(updatePersonalRecord)
  .delete(deletePersonalRecord)

module.exports = router
