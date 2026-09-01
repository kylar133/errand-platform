import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { requestContext } from './middlewares/requestContext.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

// 前端：html/ 喺 project 根（src/ 上兩層）
// http://127.0.0.1:3000/ 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'html');

export function createApp() {
  const app = express();

  app.disable('x-powered-by'); 
  app.use(helmet());
  // 跨域
  app.use(cors());
  // 每個請求：traceId + 計時起點。
  app.use(requestContext);

  // 請求 log       
  app.use(requestLogger);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api', routes);

  // 網頁打開會訪問favicon 直接 204，No Content
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // 前端靜態頁（index.html）
  app.use(express.static(FRONTEND_DIR));

  // 404 
  app.use(notFound);

  // 統一錯誤格式
  app.use(errorHandler);

  return app;
}
