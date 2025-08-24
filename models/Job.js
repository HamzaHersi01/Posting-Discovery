// models/Job.js
import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    
    // Updated image field for Cloudinary storage
    image: {
      public_id: { 
        type: String, 
        default: null 
      },
      url: { 
        type: String, 
        default: null 
      },
      originalname: {
        type: String,
        default: null
      }
    },
    
    status: { 
      type: String, 
      enum: ['open', 'accepted', 'completed', 'cancelled'], 
      default: 'open', 
      index: true 
    },
    customerId: { type: String, required: true, index: true },
    
    // New field for when a tradesman accepts the job
    tradesmanId: { type: String, default: null, index: true },

    // GeoJSON Point for precise radius queries
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      postcode: { type: String },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

JobSchema.index({ location: '2dsphere' });

export default mongoose.model('Job', JobSchema);