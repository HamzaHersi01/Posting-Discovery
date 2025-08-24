// controllers/jobsController.js

// Import required modules and services
import * as jobService from '../services/jobService.js'; // Functions for database operations
import { geocodePostcode } from '../services/geoService.js'; // Convert postcodes to coordinates
import mongoose from 'mongoose'; // MongoDB ODM for object ID validation

// POST /api/jobs - Create a new job posting
export const postJobs = async (req, res) => {
  try {
    // Extract job data from request body
    const { title, description, category, location: loc, image } = req.body;

    // Convert postcode to geographic coordinates using external API
    const geo = await geocodePostcode(loc.postcode);
    if (!geo) {
      // Return error if postcode cannot be geocoded
      return res.status(400).json({ 
        message: `Postcode not found: ${loc.postcode}` 
      });
    }

    // Create job in database with formatted location data
    const job = await jobService.createJob({
      title,
      description,
      category,
      customerId: req.user?.id || "mock-customer-id", // Use authenticated user ID or mock for testing
      imageUrl: image,
      location: { type: "Point", ...geo } // GeoJSON Point format for MongoDB geospatial queries
    });

    // Return success response with newly created job ID
    res.status(201).json({ 
      message: "Job posted successfully", 
      jobId: job._id 
    });
  } catch (err) {
    // Handle any errors during job creation
    console.error('Job creation error:', err);
    res.status(500).json({ 
      message: "Failed to create job",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined // Only show error details in development
    });
  }
};

// GET /api/jobs - Retrieve jobs with optional filtering and pagination
export const getJobs = async (req, res) => {
  try {
    // Extract query parameters from URL
    const { 
      category,       // Filter by job category (plumbing, electrical, etc.)
      radius = 5,     // Search radius in kilometers (default: 5km)
      location: postcode, // Center point for location-based search
      page = 1,       // Pagination: current page number
      limit = 10      // Pagination: number of items per page
    } = req.query;
    
    // Base filter - only show open jobs
    let filter = { status: "open" };
    // Add category filter if provided
    if (category) filter.category = category;

    // Calculate how many documents to skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let jobs = [];     // Array to store retrieved jobs
    let totalCount = 0; // Total number of jobs matching filters

    // If location parameter is provided, perform geospatial search
    if (postcode) {
      // Convert postcode to coordinates
      const geo = await geocodePostcode(postcode);
      if (geo) {
        // Use geospatial query to find jobs within specified radius
        jobs = await jobService.findJobsNearLocation(
          geo.coordinates,          // [longitude, latitude] array
          parseInt(radius) * 1000,  // Convert km to meters for MongoDB
          filter,                   // Additional filters (category, status)
          skip,                     // Pagination skip
          parseInt(limit)           // Pagination limit
        );
        
        // Get total count for pagination metadata
        totalCount = await jobService.countJobsNearLocation(
          geo.coordinates,
          parseInt(radius) * 1000,
          filter
        );
      } else {
        // Fallback: if geocoding fails, return all jobs (with filters)
        console.warn(`Failed to geocode postcode ${postcode}, returning all jobs`);
        jobs = await jobService.findJobs(filter, skip, parseInt(limit));
        totalCount = await jobService.countJobs(filter);
      }
    } else {
      // No location provided: return all jobs (with optional category filter)
      jobs = await jobService.findJobs(filter, skip, parseInt(limit));
      totalCount = await jobService.countJobs(filter);
    }

    // Return formatted response with jobs and pagination metadata
    res.json({
      jobs: jobs.map(j => ({
        id: j._id,
        title: j.title,
        description: j.description,
        location: j.location.postcode, // Return postcode for display
        status: j.status,
        customerId: j.customerId,
        category: j.category,
        createdAt: j.createdAt
      })),
      pagination: {
        page: parseInt(page),        // Current page
        limit: parseInt(limit),      // Items per page
        total: totalCount,           // Total items matching filters
        pages: Math.ceil(totalCount / parseInt(limit)) // Total pages
      }
    });
  } catch (err) {
    // Handle errors during job retrieval
    console.error('Job fetch error:', err);
    res.status(500).json({ 
      message: "Failed to fetch jobs",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /api/jobs/:id - Retrieve a single job by ID
export const getJob = async (req, res) => {
  try {
    const { id } = req.params; // Extract job ID from URL parameters
    
    // Validate that ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }
    
    // Find job by ID in database
    const job = await jobService.findJobById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Return complete job details
    res.json({
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location.postcode,
      status: job.status,
      customerId: job.customerId,
      tradesmanId: job.tradesmanId, // ID of tradesman who accepted the job
      category: job.category,
      imageUrl: job.imageUrl,       // URL of job image
      createdAt: job.createdAt,     // When job was created
      updatedAt: job.updatedAt      // When job was last updated
    });
  } catch (err) {
    // Handle errors during single job retrieval
    console.error('Single job fetch error:', err);
    res.status(500).json({ 
      message: "Failed to fetch job",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// PUT /api/jobs/:id - Update an existing job
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params; // Job ID from URL
    const updates = req.body;  // Update data from request body

    // Validate job ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }

    // Check if job exists before attempting update
    const existingJob = await jobService.findJobById(id);
    if (!existingJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    // If postcode is being updated, geocode the new postcode
    if (updates.location?.postcode) {
      const geo = await geocodePostcode(updates.location.postcode);
      if (!geo) {
        return res.status(400).json({ 
          message: `Postcode not found: ${updates.location.postcode}` 
        });
      }
      // Replace postcode string with complete GeoJSON Point
      updates.location = { type: "Point", ...geo };
    }

    // Perform the update operation
    const job = await jobService.updateJobById(id, updates);
    
    // Return success response with updated job data
    res.json({ 
      message: "Job updated successfully", 
      job: {
        id: job._id,
        title: job.title,
        description: job.description,
        location: job.location.postcode,
        status: job.status,
        customerId: job.customerId,
        category: job.category
      }
    });
  } catch (err) {
    // Handle errors during job update
    console.error("Update job error:", err);
    res.status(500).json({ 
      message: "Failed to update job",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// DELETE /api/jobs/:id - Remove a job from the database
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params; // Job ID from URL
    
    // Validate job ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }
    
    // Attempt to delete the job
    const job = await jobService.deleteJobById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Return success message
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    // Handle errors during job deletion
    console.error("Delete job error:", err);
    res.status(500).json({ 
      message: "Failed to delete job",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};