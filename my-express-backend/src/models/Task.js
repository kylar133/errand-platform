import mongoose from 'mongoose';

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    publisher: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    runner: {
      id: String,
      name: String,
      default: null, // 未接單
    },

    title: { type: String, required: true },
    category: { type: String, enum: ['buy', 'deliver', 'queue', 'other'], required: true },
    rewardFee: { type: Number, min: 50, required: true },
    itemSize: { type: String, enum: ['small', 'medium', 'large'] },
    description: { type: String, maxlength: 500 },

    city: { type: String, required: true },
    district: { type: String, required: true },
    addressDetail: { type: String, required: true },
    destCity: String,
    destDistrict: String,
    destAddress: String,
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'finished', 'cancelled'],
      default: 'pending',
    },
    // deadline 預設「而家 + 24 小時」
    deadline: { type: Date, default: () => new Date(Date.now() + 24 * 3600 * 1000) },
  },
  { timestamps: true }
);

// 任務列表常用索引
taskSchema.index({ status: 1, city: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
