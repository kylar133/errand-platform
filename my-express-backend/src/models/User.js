import mongoose from 'mongoose';

// User Schema。
const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }, // bcrypt hash
    name: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
