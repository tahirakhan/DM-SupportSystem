import { app } from './app';
import { loadConfig } from './config/config';

const PORT = process.env['PORT'] ?? 3000;

try {
  loadConfig();
  app.listen(PORT, () => {
    console.log(`ADO Dashboard backend running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
} catch (err) {
  console.error('Failed to start server:', (err as Error).message);
  process.exit(1);
}
