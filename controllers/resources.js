import resourceModel from '../models/resources.js';
import { ObjectId } from 'mongodb';
import { openDb } from '../db/database.js';

export const resources = {
    getAll: async (req, res, next) => {
        try {
            res.json(await resourceModel.getAll());
        } catch (error) {
            next(error);
        }
    },

    getOne: async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ error: 'Invalid resource ID' });
            }

            const resource = await resourceModel.getOne(req.params.id);

            if (!resource._id) {
                return res.status(404).json({ error: 'Resource not found' });
            }

            const db = await openDb();
            const bookings = await db.collection('bookings')
                .find({ resourceId: resource._id })
                .toArray();

            res.json({ resource, bookings });
        } catch (error) {
            next(error);
        }
    },

    addOne: async (req, res, next) => {
        try {
            const result = await resourceModel.addOne(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    deleteOne: async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ error: 'Invalid resource ID' });
            }

            const result = await resourceModel.deleteOne(req.params.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    updateOne: async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ error: 'Invalid resource ID' });
            }

            const result = await resourceModel.updateOne(
                req.params.id,
                req.body
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
};