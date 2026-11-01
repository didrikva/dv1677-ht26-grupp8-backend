import { createServer } from 'http';
import { Server } from 'socket.io';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import app from './app.js';
import { openDb } from './db/database.js';
import { syncResources } from './domain/syncResources.js';

const PORT = process.env.PORT || 3000;
    
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://dv1677-laforge.nplab.bth.se',
      'https://didrikva.github.io'
    ],
    methods: ['GET', 'POST']
  }
})

app.set('io', io);



io.on('connection', (socket) => {
  console.log('ansluten:', socket.id);

  socket.on('join', (resourceId) => {
    socket.join(`resource:${resourceId}`)
  })

  socket.on('join:booking', async (bookingId, acknowledge) => {
    try {
        const user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET)

        const booking = await (await openDb()).collection('bookings').findOne({
        _id: new ObjectId(bookingId),
        bookedBy: String(user._id)
        })

        if (!booking) return acknowledge?.({ ok: false })

        socket.join(`booking:${bookingId}`)
        acknowledge?.({ ok: true })
    } catch (error) {
        console.error('Could not join booking:', error)
        acknowledge?.({ ok: false })
    }
    })

  socket.on('disconnect', () => {
    console.log('frånkopplad:', socket.id);
  });
});

async function startServer() {
    try {
        await openDb();

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        syncResources()
            .then(() => {
                console.log('Resource synchronization completed');
            })
            .catch((error) => {
                console.error('Resource synchronization failed:', error);
            });
    } catch (error) {
        console.error('Could not connect to MongoDB:', error);
        process.exitCode = 1;
    }
}

startServer();