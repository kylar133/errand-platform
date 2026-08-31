import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { pathToFileURL } from 'node:url';

export async function startServer({ port = Number(process.env.PORT ?? 3000) } = {}) {
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('listening', () => {
      setImmediate(() => resolve(server));
    });
    server.once('error', reject);
  });
}

export async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connectDB();
  try {
    const server = await startServer();
    const address = server.address();
    if (!address) {
      throw Object.assign(new Error('port 以佔用'), { code: 'EADDRINUSE' });
    }
    console.log(`Server: http://localhost:${address.port}`);

    const stop = async () => {
      await stopServer(server);
      await disconnectDB();
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(` Port ${process.env.PORT ?? 3000} 以佔用`);
    } else {
      console.error(' start server error：' + err.message);
    }
    await disconnectDB();
    process.exit(1);
  }
}
