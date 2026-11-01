import { ObjectId } from 'mongodb'
import { openDb } from '../db/database.js';

export async function createComment(req, res) {
  const db = await openDb()

  let bookingId

  try {
    bookingId = new ObjectId(req.params.bookingId)
  } catch {
    return res.status(400).json({ error: 'Invalid booking ID' })
  }

  // Hitta endast bokningar som tillhör den inloggade användaren
  const booking = await db.collection('bookings').findOne({
    _id: bookingId,
    bookedBy: req.user._id
  })

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const text = req.body.text?.trim()

  if (!text) {
    return res.status(400).json({ error: 'Comment cannot be empty' })
  }

  const comment = {
    bookingId,
    author: req.user._id,
    text,
    createdAt: new Date()
  }

  const result = await db.collection('comments').insertOne(comment)

  return res.status(201).json({
    _id: result.insertedId,
    ...comment
  })
}

export async function deleteComment(req, res) {
  const db = await openDb()

  let commentId

  try {
    commentId = new ObjectId(req.params.id)
  } catch {
    return res.status(400).json({ error: 'Invalid comment ID' })
  }

  // Hitta endast kommentarer som användaren själv skrivit
  const comment = await db.collection('comments').findOne({
    _id: commentId,
    author: req.user._id
  })

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' })
  }

  // Hitta endast bokningar som tillhör den inloggade användaren
  const booking = await db.collection('bookings').findOne({
    _id: comment.bookingId,
    bookedBy: req.user._id
  })

  if (!booking) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  await db.collection('comments').deleteOne({
    _id: commentId,
    author: req.user._id
  })

  return res.json({ message: 'Comment deleted' })
}

export async function getMyComments(req, res) {
  const db = await openDb()

  let bookingId

  try {
    bookingId = new ObjectId(req.params.bookingId)
  } catch {
    return res.status(400).json({ error: 'Invalid booking ID' })
  }
  // Hitta endast bokningar som tillhör den inloggade användaren
  const booking = await db.collection('bookings').findOne({
    _id: bookingId,
    bookedBy: req.user._id
  })

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const comments = await db.collection('comments')
    .find({ bookingId })
    .sort({ createdAt: 1 })
    .toArray()

  return res.json(comments)
}
