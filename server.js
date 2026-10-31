import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { openDb } from './db/database.js';
import { syncResources } from './domain/syncResources.js';

const PORT = process.env.PORT || 3000;
    
const httpServer = createServer(app);

const io = new Server(httpServer, { cors: { origin: '*' } });

app.set('io', io);



io.on('connection', (socket) => {
  console.log('ansluten:', socket.id);

  socket.on('join', (resourceId) => {
    socket.join(`resource:${resourceId}`)
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