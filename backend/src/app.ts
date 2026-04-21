import express from 'express';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { router } from './routes/index';

const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use('/api', router);
app.use(errorMiddleware);

export { app };
