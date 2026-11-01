import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { openDb } from '../db/database.js'

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export async function register(req, res) {
  const email = normalizeEmail(req.body.email)
  const { password } = req.body
  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'E-post och lösenord krävs' })
  }

  const db = await openDb()
  const users = db.collection('users')
  await users.createIndex({ email: 1 }, { unique: true })

  const hash = await bcrypt.hash(password, 10)
  try {
    await users.insertOne({ email, password: hash })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'E-posten används redan' })
    }
    throw error
  }
  return res.status(201).json({ message: 'Användare skapad' })
}

export async function login(req, res) {
  const email = normalizeEmail(req.body.email)
  const { password } = req.body
  if (!email || typeof password !== 'string') {
    return res.status(401).json({ error: 'Fel e-post eller lösenord' })
  }

  const db = await openDb()
  const user = await db.collection('users').findOne({ email })
  const ok = user && await bcrypt.compare(password, user.password)

  if (!ok) {
    // Samma svar oavsett om e-posten eller lösenordet var fel
    return res.status(401).json({ error: 'Fel e-post eller lösenord' })
  }

  const token = jwt.sign(
    { _id: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  )
  return res.json({ token })
}
