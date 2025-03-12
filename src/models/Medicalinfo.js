const mongoose = require('mongoose')

const medicalInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: ''
    },
    allergies: {
      type: String,
      default: ''
    },
    conditions: {
      type: String,
      default: ''
    },
    medications: {
      type: String,
      default: ''
    },
    emergencyContact: {
      type: String,
      default: ''
    },
    emergencyPhone: {
      type: String,
      default: ''
    },
    lastCheckup: {
      type: Date,
      default: null
    },
    doctorName: {
      type: String,
      default: ''
    },
    doctorPhone: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('MedicalInfo', medicalInfoSchema)
