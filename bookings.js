import { ObjectId } from 'mongodb';
import { openDb } from './db/database.js';

const bookings = {
    getByResource: async function getByResource(resourceId) {
        const db = await openDb();
        return db.collection('bookings')
            .find({ resource_id: new ObjectId(resourceId) })
            .sort({ start_time: 1 })
            .toArray();
    },
    getByUser: async function getByUser(userId) {
        const db = await openDb();
        return db.collection('bookings')
            .find({ user: userId })
            .sort({ start_time: 1 })
            .toArray();
    },
    addOne: async function addOne(body, userId) {
        const db = await openDb();
        const result = await db.collection('bookings').insertOne({
            resource_id: new ObjectId(body.resource_id),
            user: userId,
            start_time: body.start_time,
            end_time: body.end_time,
            status: 'confirmed'
        });
        return { lastID: result.insertedId };
    },
    deleteOne: async function deleteOne(id, userId) {
        const db = await openDb();
        const result = await db.collection('bookings').deleteOne({ _id: new ObjectId(id), user: userId });
        return { changes: result.deletedCount };
    },
    updateOne: async function updateOne(id, body, userId) {
        const db = await openDb();
        const result = await db.collection('bookings').updateOne(
            { _id: new ObjectId(id), user: userId },
            { $set: {
                resource_id: new ObjectId(body.resource_id),
                start_time: body.start_time,
                end_time: body.end_time,
                status: body.status
            } }
        );
        return { changes: result.matchedCount };
    }
};

export default bookings;