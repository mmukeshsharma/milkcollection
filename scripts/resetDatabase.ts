import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import bcrypt from 'bcryptjs'

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath))
  for (const k in envConfig) {
    process.env[k] = envConfig[k]
  }
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local')
  process.exit(1)
}

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI)
    await mongoose.connect(MONGODB_URI!)
    console.log('Connected to database.')

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection failed')
    }

    // Collections to drop/delete
    const collectionsToReset = [
      'customers',
      'milkpurchases',
      'milksales',
      'payments',
      'passbookentries',
      'products',
      'inventorytransactions',
      'itemsales'
    ]

    const collections = await db.listCollections().toArray()
    const existingNames = collections.map(c => c.name.toLowerCase())

    for (const name of collectionsToReset) {
      if (existingNames.includes(name)) {
        console.log(`Dropping collection: ${name}`)
        await db.dropCollection(name)
      } else {
        console.log(`Collection ${name} does not exist, skipping drop.`)
      }
    }

    // Keep / upsert Admin account in users collection
    let usersCollection = db.collection('users')
    const adminEmail = 'admin@sharmadairy.com'
    const existingAdmin = await usersCollection.findOne({ email: adminEmail })

    if (!existingAdmin) {
      console.log('Creating default admin user account...')
      const hashedPassword = await bcrypt.hash('Admin@123', 10)
      await usersCollection.insertOne({
        name: 'Default Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        active: true,
        createdAt: new Date()
      })
      console.log('Default admin account created: admin@sharmadairy.com / Admin@123')
    } else {
      console.log('Admin account already exists, keeping it.')
    }

    // Keep settings or write default settings if missing
    let settingsCollection = db.collection('settings')
    const defaultSettings = [
      { key: 'language', value: 'en' },
      { key: 'business_name', value: 'Sharma Dairy' }
    ]

    for (const setting of defaultSettings) {
      const exists = await settingsCollection.findOne({ key: setting.key })
      if (!exists) {
        await settingsCollection.insertOne({
          ...setting,
          created_at: new Date()
        })
        console.log(`Initialized default setting: ${setting.key}`)
      }
    }

    console.log('Database reset successfully!')
  } catch (error) {
    console.error('Error resetting database:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from database.')
  }
}

resetDatabase()
