import { ObjectId } from 'mongodb';
import { openDb } from './db/database.js';

const resources = {
    getAll: async function getAll() {
        const db = await openDb();
        return db.collection('resources').find().toArray();
    },
    getOne: async function getOne(id) {
        const db = await openDb();
        const document = await db.collection('resources').findOne({ _id: new ObjectId(id) });
        return document || {};
    },
    addOne: async function addOne(body) {
        const db = await openDb();
        const result = await db.collection('resources').insertOne({
            name: body.name,
            type: body.type,
            description: body.description,
            capacity: body.capacity || 1
        });
        return { lastID: result.insertedId };
    },
    deleteOne: async function deleteOne(id) {
        const db = await openDb();
        const result = await db.collection('resources').deleteOne({ _id: new ObjectId(id) });
        return { changes: result.deletedCount };
    },
    updateOne: async function updateOne(id, body) {
        const db = await openDb();
        const result = await db.collection('resources').updateOne(
            { _id: new ObjectId(id) },
            { $set: {
                name: body.name,
                type: body.type,
                description: body.description,
                capacity: body.capacity || 1
            } }
        );
        return { changes: result.modifiedCount };
    }
};

export default resources;