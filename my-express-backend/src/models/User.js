import mongoose from 'mongoose';

// User Schema。
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true, select: false }, // bcrypt hash
    name: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true, strict: 'throw', versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true, name: 'uniq_user_email' });

export const User = mongoose.model('User', userSchema);
