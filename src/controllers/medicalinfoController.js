const MedicalInfo = require('../models/Medicalinfo')
const User = require('../models/User')

exports.getMedicalInfo = async (req, res) => {
  try {
    const userId = req.user._id

    const medicalInfo = await MedicalInfo.findOne({ user: userId })

    if (!medicalInfo) {
      return res.status(200).json({
        success: true,
        data: {
          bloodType: '',
          allergies: '',
          conditions: '',
          medications: '',
          emergencyContact: '',
          emergencyPhone: '',
          lastCheckup: '',
          doctorName: '',
          doctorPhone: ''
        }
      })
    }

    res.status(200).json({
      success: true,
      data: medicalInfo
    })
  } catch (error) {
    console.error('Error al obtener información médica:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener información médica',
      error: error.message
    })
  }
}

exports.updateMedicalInfo = async (req, res) => {
  try {
    const userId = req.user._id
    const {
      bloodType,
      allergies,
      conditions,
      medications,
      emergencyContact,
      emergencyPhone,
      lastCheckup,
      doctorName,
      doctorPhone
    } = req.body

    let medicalInfo = await MedicalInfo.findOne({ user: userId })

    if (medicalInfo) {
      medicalInfo.bloodType = bloodType
      medicalInfo.allergies = allergies
      medicalInfo.conditions = conditions
      medicalInfo.medications = medications
      medicalInfo.emergencyContact = emergencyContact
      medicalInfo.emergencyPhone = emergencyPhone
      medicalInfo.lastCheckup = lastCheckup || null
      medicalInfo.doctorName = doctorName
      medicalInfo.doctorPhone = doctorPhone

      await medicalInfo.save()
    } else {
      medicalInfo = new MedicalInfo({
        user: userId,
        bloodType,
        allergies,
        conditions,
        medications,
        emergencyContact,
        emergencyPhone,
        lastCheckup: lastCheckup || null,
        doctorName,
        doctorPhone
      })

      await medicalInfo.save()
    }

    res.status(200).json({
      success: true,
      message: 'Información médica guardada correctamente',
      data: medicalInfo
    })
  } catch (error) {
    console.error('Error al guardar información médica:', error)
    res.status(500).json({
      success: false,
      message: 'Error al guardar información médica',
      error: error.message
    })
  }
}

exports.getMedicalInfoByAdmin = async (req, res) => {
  try {
    const { userId } = req.params

    const userExists = await User.findById(userId)
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const medicalInfo = await MedicalInfo.findOne({ user: userId }).populate(
      'user',
      'nombre email rol avatar'
    )

    if (!medicalInfo) {
      return res.status(404).json({
        success: false,
        message: 'Información médica no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: medicalInfo
    })
  } catch (error) {
    console.error('Error al obtener información médica:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener información médica',
      error: error.message
    })
  }
}

exports.getAllMedicalInfo = async (req, res) => {
  try {
    if (
      req.user.rol !== 'admin' &&
      req.user.rol !== 'administrador' &&
      req.user.rol !== 'creador'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta información'
      })
    }

    let medicalInfoList = await MedicalInfo.find().populate({
      path: 'user',
      select: 'nombre email rol avatar',
      model: 'User'
    })

    const validRecords = medicalInfoList.filter((info) => info.user != null)
    if (validRecords.length !== medicalInfoList.length) {
      console.warn(
        `Se encontraron ${
          medicalInfoList.length - validRecords.length
        } registros con referencias a usuarios inexistentes`
      )
      medicalInfoList = validRecords
    }

    console.log(
      'Datos de usuarios recuperados:',
      medicalInfoList.map((info) => ({
        userId: info.user?._id,
        nombre: info.user?.nombre,
        email: info.user?.email
      }))
    )

    res.status(200).json({
      success: true,
      data: medicalInfoList
    })
  } catch (error) {
    console.error('Error al obtener lista de información médica:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener lista de información médica',
      error: error.message
    })
  }
}
