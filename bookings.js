import { ObjectId } from 'mongodb';
import { db } from './db/database.js';

const bookings = {
    getByResource: async function getByResource(resourceId) {
        return db.collection('bookings')
            .find({ resource_id: new ObjectId(resourceId) })
            .sort({ start_time: 1 })
            .toArray();
    },
    addOne: async function addOne(body) {
        const result = await db.collection('bookings').insertOne({
            resource_id: new ObjectId(body.resource_id),
            user: body.user,
            start_time: body.start_time,
            end_time: body.end_time,
            status: 'confirmed'
        });
        return { lastID: result.insertedId };
    },
    deleteOne: async function deleteOne(id) {
        const result = await db.collection('bookings').deleteOne({ _id: new ObjectId(id) });
        return { changes: result.deletedCount };
    },
    updateOne: async function updateOne(id, body) {
        const result = await db.collection('bookings').updateOne(
            { _id: new ObjectId(id) },
            { $set: {
                resource_id: new ObjectId(body.resource_id),
                user: body.user,
                start_time: body.start_time,
                end_time: body.end_time,
                status: body.status
            } }
        );
        return { changes: result.modifiedCount };
    }
};

export default bookings;