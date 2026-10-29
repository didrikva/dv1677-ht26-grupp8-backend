import express from 'express'
import cors from 'cors'
import bookings from './routes/bookings.js'
import resources from './routes/resources.js'
import auth from './routes/auth.js'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://dv1677-laforge.nplab.bth.se'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use((req, res, next) => {
  req.io = app.get('io')
  next()
})

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(bookings)
app.use(resources)
app.use(auth)

export default app;


// import 'dotenv/config';
// import express from 'express';
// import path from 'path';
// import morgan from 'morgan';
// import cors from 'cors';
// import resources from "./resources.js";
// import bookings from "./bookings.js";
// import { openDb } from "./db/database.js";

// const port = process.env.PORT;
// const app = express();

// app.disable('x-powered-by');
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors());

// if (process.env.NODE_ENV !== 'test') {
//     app.use(morgan('combined'));
// }

// // --- Resurser ---

// app.get('/api/resources', async (req, res) => {
//     const result = await resources.getAll();
//     return res.json(result);
// });

// // app.get('/resources/new', async (req, res) => {
// //     return res.render("resource-form", { resource: {} });
// // });

// app.post('/api/resources', async (req, res) => {
//     const result = await resources.addOne(req.body);
//     return res.status(201).json(result);
// });

// app.get('/api/resources/:id', async (req, res) => {
//     const resource = await resources.getOne(req.params.id);
//     const resourceBookings = await bookings.getByResource(req.params.id);

//     return res.json({
//         resource,
//         bookings: resourceBookings
//     });
// });

// app.put('/api/resources/:id', async (req, res) => {
//     const result = await resources.updateOne(req.params.id, req.body);
//     return res.json(result);
// });

// // app.get('/api/resources/:id/edit', async (req, res) => {
// //     return res.render("resource-form", {
// //         resource: await resources.getOne(req.params.id)
// //     });
// // });

// app.delete('/api/resources/:id', async (req, res) => {
//     const result = await resources.deleteOne(req.params.id);
//     return res.json(result);
// });

// // --- Bokningar ---

// app.post('/api/bookings', async (req, res) => {
//     const result = await bookings.addOne(req.body);
//     return res.status(201).json(result);
// });

// app.delete('/api/bookings/:id', async (req, res) => {
//     const result = await bookings.deleteOne(req.params.id);
//     return res.json(result);
// });

// app.put('/api/bookings/:id', async (req, res) => {
//     const result = await bookings.updateOne(req.params.id, req.body);
//     return res.json(result);
// });

// if (process.env.NODE_ENV !== 'test') {
//     openDb()
//         .then(() => {
//             app.listen(port, () => {
//                 console.log(`Proxmox Booking app listening on port ${port}`);
//             });
//         })
//         .catch((error) => {
//             console.error('Could not connect to MongoDB:', error);
//             process.exitCode = 1;
//         });
// }

// export default app;
