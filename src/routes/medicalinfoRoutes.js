const express = require('express')
const {
  getMedicalInfo,
  updateMedicalInfo,
  getMedicalInfoByAdmin,
  getAllMedicalInfo
} = require('../controllers/medicalinfoController')
const { protect, authorize } = require('../middlewares/authMiddleware')

const router = express.Router()

router.route('/').get(protect, getMedicalInfo).post(protect, updateMedicalInfo)

router
  .route('/admin/all')
  .get(
    protect,
    authorize('admin', 'administrador', 'creador'),
    getAllMedicalInfo
  )
router
  .route('/admin/:userId')
  .get(
    protect,
    authorize('admin', 'administrador', 'creador'),
    getMedicalInfoByAdmin
  )

module.exports = router
