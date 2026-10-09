import 'dotenv/config';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import resources from "./resources.js";
import bookings from "./bookings.js";
import { openDb } from "./db/database.js";

const port = process.env.PORT;
const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// --- Resurser ---

app.get('/api/resources', async (req, res) => {
    const result = await resources.getAll();
    return res.json(result);
});

// app.get('/resources/new', async (req, res) => {
//     return res.render("resource-form", { resource: {} });
// });

app.post('/api/resources', async (req, res) => {
    const result = await resources.addOne(req.body);
    return res.status(201).json(result);
});

app.get('/api/resources/:id', async (req, res) => {
    const resource = await resources.getOne(req.params.id);
    const resourceBookings = await bookings.getByResource(req.params.id);

    return res.json({
        resource,
        bookings: resourceBookings
    });
});

app.put('/api/resources/:id', async (req, res) => {
    const result = await resources.updateOne(req.params.id, req.body);
    return res.json(result);
});

// app.get('/api/resources/:id/edit', async (req, res) => {
//     return res.render("resource-form", {
//         resource: await resources.getOne(req.params.id)
//     });
// });

app.delete('/api/resources/:id', async (req, res) => {
    const result = await resources.deleteOne(req.params.id);
    return res.json(result);
});

// --- Bokningar ---

app.post('/api/bookings', async (req, res) => {
    const result = await bookings.addOne(req.body);
    return res.status(201).json(result);
});

app.delete('/api/bookings/:id', async (req, res) => {
    const result = await bookings.deleteOne(req.params.id);
    return res.json(result);
});

app.put('/api/bookings/:id', async (req, res) => {
    const result = await bookings.updateOne(req.params.id, req.body);
    return res.json(result);
});

if (process.env.NODE_ENV !== 'test') {
    openDb()
        .then(() => {
            app.listen(port, () => {
                console.log(`Proxmox Booking app listening on port ${port}`);
            });
        })
        .catch((error) => {
            console.error('Could not connect to MongoDB:', error);
            process.exitCode = 1;
        });
}

export default app;
