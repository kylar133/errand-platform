import mongoose from 'mongoose';
import { config } from './config.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';

export async function connectDB() {
  mongoose.connection.on('connected', () => console.log(`MongoDB connected: ${config.mongoUri}`));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 2500, // 連唔到 2.5 秒內報錯
    maxPoolSize: 5,
  });

  await Promise.all([User.init(), Task.init()]);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
