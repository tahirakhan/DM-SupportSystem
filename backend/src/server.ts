import { app } from './app';
import { loadConfig } from './config/config';
import { connectMongo, disconnectMongo } from './db/connection';

const PORT = process.env['PORT'] ?? 3000;

(async () => {
  try {
    loadConfig();
    await connectMongo();
    const server = app.listen(PORT, () => {
      console.log(`ADO Dashboard backend running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown on SIGINT
    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await disconnectMongo();
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', (err as Error).message);
    process.exit(1);
  }
})();
