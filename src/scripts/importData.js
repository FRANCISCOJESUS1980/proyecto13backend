const mongoose = require('mongoose')
const dotenv = require('dotenv')
const User = require('../models/User')
const connectDB = require('../config/db')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

dotenv.config()
connectDB()

const importUsers = async () => {
  try {
    const users = []
    fs.createReadStream(path.join(__dirname, 'users.csv'))
      .pipe(csv())
      .on('data', (row) => users.push(row))
      .on('end', async () => {
        await User.insertMany(users)
        process.exit()
      })
  } catch (error) {
    console.error('Error importando datos:', error)
    process.exit(1)
  }
}

importUsers()
