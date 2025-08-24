import * as jobService from '../services/jobService.js'; // Functions for database operations
import { geocodePostcode } from '../services/geoService.js'; // Convert postcodes to coordinates
import mongoose from 'mongoose'; // MongoDB ODM for object ID validation
import cloudinary from "../config/cloudinary.js";
import Job from '../models/Job.js';

export const postJobs = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;

    if (!title || !description || !category || !location?.postcode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Geocode postcode to get coordinates
    const geo = await geocodePostcode(location.postcode);
    if (!geo) {
      return res.status(400).json({ message: `Invalid postcode: ${location.postcode}` });
    }

    // Handle optional image upload
    let imageData = null;
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "repairo/jobs",
      });
      imageData = {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
        originalname: req.file.originalname,
      };
    } else if (req.body.image) {
      // Optional: allow JSON image URL
      imageData = {
        url: req.body.image,
        public_id: null,
        originalname: null,
      };
    }

    // Create the job
    const newJob = new Job({
      title,
      description,
      category,
      customerId: req.user?.id || "mock-customer-id",
      location: {
        type: "Point",
        coordinates: geo.coordinates,
        postcode: geo.postcode,
      },
      image: imageData,
    });

    await newJob.save();

    res.status(201).json(newJob);
  } catch (err) {
    console.error("Error posting job:", err);
    res.status(500).json({ message: "Server error posting job" });
  }
};

// GET /api/jobs - List jobs with optional filters
export const getJobs = async (req, res) => {
  try {
    const { category, radius = 5, location: postcode, page = 1, limit = 10 } = req.query;
    const filter = { status: "open" };
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let jobs = [], totalCount = 0;

    if (postcode) {
      const geo = await geocodePostcode(postcode);
      if (geo) {
        jobs = await jobService.findJobsNearLocation(geo.coordinates, parseInt(radius) * 1000, filter, skip, parseInt(limit));
        totalCount = await jobService.countJobsNearLocation(geo.coordinates, parseInt(radius) * 1000, filter);
      } else {
        jobs = await jobService.findJobs(filter, skip, parseInt(limit));
        totalCount = await jobService.countJobs(filter);
      }
    } else {
      jobs = await jobService.findJobs(filter, skip, parseInt(limit));
      totalCount = await jobService.countJobs(filter);
    }

    res.json({
      jobs: jobs.map(j => ({
        id: j._id,
        title: j.title,
        description: j.description,
        location: j.location.postcode,
        status: j.status,
        customerId: j.customerId,
        category: j.category,
        image: j.image?.url || null,
        createdAt: j.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Job fetch error:', err);
    res.status(500).json({ message: "Failed to fetch jobs", error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// GET /api/jobs/:id - Get single job
export const getJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid job ID format" });

    const job = await jobService.findJobById(id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json({
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location.postcode,
      status: job.status,
      customerId: job.customerId,
      tradesmanId: job.tradesmanId,
      category: job.category,
      image: job.image || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (err) {
    console.error('Single job fetch error:', err);
    res.status(500).json({ message: "Failed to fetch job", error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// PUT /api/jobs/:id - Update job
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    console.log("Existing job before update:", job);

    const updates = { ...req.body };
    const removeImage = updates.removeImage === 'true';
    console.log("Remove image flag:", removeImage);
    console.log("Incoming file:", req.file);

    // Delete old image if needed
    if ((req.file || removeImage) && job.image?.public_id) {
      console.log("Deleting old image from Cloudinary:", job.image.public_id);
      const destroyRes = await cloudinary.uploader.destroy(job.image.public_id);
      console.log("Destroy response:", destroyRes);
      updates.image = null;
    }

    // Upload new image if provided
    if (req.file) {
      console.log("Uploading new image...");
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: "repairo/jobs" });
      console.log("Upload response:", uploadRes);
      updates.image = {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
        originalname: req.file.originalname,
      };
    }

    // Handle postcode update
    if (updates.location?.postcode) {
      const geo = await geocodePostcode(updates.location.postcode);
      if (!geo) {
        return res.status(400).json({ message: `Postcode not found: ${updates.location.postcode}` });
      }
      updates.location = {
        type: "Point",
        coordinates: geo.coordinates,
        postcode: geo.postcode,
      };
    }

    console.log("Final updates object:", updates);

    const updatedJob = await Job.findByIdAndUpdate(id, updates, { new: true });
    console.log("Updated job:", updatedJob);

    res.status(200).json({
      message: "Job updated successfully",
      job: updatedJob,
    });
  } catch (err) {
    console.error("Error updating job:", err);
    res.status(500).json({ message: "Server error updating job" });
  }
};


// DELETE /api/jobs/:id - Delete job
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid job ID format" });

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Delete image from Cloudinary if exists
    if (job.image?.public_id) await cloudinary.uploader.destroy(job.image.public_id);

    await jobService.deleteJobById(id);
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ message: "Failed to delete job", error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// GET /api/jobs/customer/:customerId
export const getJobsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const jobs = await Job.find({ customerId });

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: 'No jobs found for this customer' });
    }

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs by customerId:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/jobs/tradesman/:tradesmanId
export const getJobsByTradesman = async (req, res) => {
  try {
    const { tradesmanId } = req.params;
    const jobs = await Job.find({ tradesmanId });

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: 'No jobs found for this tradesman' });
    }

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs by tradesmanId:', error);
    res.status(500).json({ error: 'Server error' });
  }
};