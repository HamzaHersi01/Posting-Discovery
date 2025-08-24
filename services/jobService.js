// Import the Job model for database operations
import Job from '../models/Job.js';

/**
 * Create a new job in the database
 * @param {Object} data - Job data including title, description, category, location, etc.
 * @returns {Promise<Object>} - The newly created job document
 */
export const createJob = async (data) => {
  // Create a new Job instance with the provided data
  const job = new Job(data);
  // Save the job to MongoDB and return the result
  return await job.save();
};

/**
 * Find jobs with filtering, sorting, and pagination
 * @param {Object} filter - MongoDB query filter (e.g., { status: "open", category: "plumbing" })
 * @param {number} skip - Number of documents to skip for pagination
 * @param {number} limit - Maximum number of documents to return
 * @returns {Promise<Array>} - Array of job documents
 */
export const findJobs = async (filter, skip = 0, limit = 10) => {
  return Job.find(filter)
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)              // Skip documents for pagination
    .limit(limit)            // Limit number of results
    .select("title description status customerId location category createdAt"); // Only return specific fields
};

/**
 * Find jobs near a specific location using geospatial query
 * Uses MongoDB aggregation pipeline with $geoNear for efficient location-based searches
 * @param {Array} coordinates - [longitude, latitude] array of the center point
 * @param {number} maxDistance - Maximum distance in meters from the center point
 * @param {Object} filter - Additional filters (e.g., category, status)
 * @param {number} skip - Number of documents to skip for pagination
 * @param {number} limit - Maximum number of documents to return
 * @returns {Promise<Array>} - Array of job documents with distance information
 */
export const findJobsNearLocation = async (coordinates, maxDistance, filter = {}, skip = 0, limit = 10) => {
  // Create aggregation pipeline for geospatial query
  const aggregationPipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates }, // Center point for search
        distanceField: "distance",            // Add distance field to each result
        maxDistance: maxDistance,             // Maximum search radius in meters
        spherical: true,                      // Use spherical geometry for accurate distances
        query: filter                         // Apply additional filters (category, status, etc.)
      }
    },
    { $sort: { createdAt: -1 } },            // Sort by newest jobs first
    { $skip: skip },                         // Pagination: skip documents
    { $limit: limit },                       // Pagination: limit results
    {
      $project: {                            // Shape the output document
        title: 1,                            // Include title field
        description: 1,                      // Include description field
        status: 1,                           // Include status field
        customerId: 1,                       // Include customerId field
        location: 1,                         // Include location field (with coordinates and postcode)
        category: 1,                         // Include category field
        createdAt: 1                         // Include createdAt field
      }
    }
  ];

  // Execute the aggregation pipeline
  return Job.aggregate(aggregationPipeline);
};

/**
 * Count total number of jobs matching the filter criteria
 * @param {Object} filter - MongoDB query filter
 * @returns {Promise<number>} - Count of matching documents
 */
export const countJobs = async (filter) => {
  return Job.countDocuments(filter);
};

/**
 * Count number of jobs near a specific location
 * Uses aggregation pipeline to efficiently count geospatial results
 * @param {Array} coordinates - [longitude, latitude] array of the center point
 * @param {number} maxDistance - Maximum distance in meters from the center point
 * @param {Object} filter - Additional filters (e.g., category, status)
 * @returns {Promise<number>} - Count of jobs within the specified radius
 */
export const countJobsNearLocation = async (coordinates, maxDistance, filter = {}) => {
  const aggregationPipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates }, // Center point for search
        distanceField: "distance",            // Add distance field (required but not used in count)
        maxDistance: maxDistance,             // Maximum search radius in meters
        spherical: true,                      // Use spherical geometry
        query: filter                         // Apply additional filters
      }
    },
    { $count: "count" } // MongoDB stage to count documents and return { count: number }
  ];

  // Execute aggregation and extract count from result
  const result = await Job.aggregate(aggregationPipeline);
  return result[0]?.count || 0; // Return 0 if no results found
};

/**
 * Find a single job by its MongoDB ID
 * @param {string} id - MongoDB ObjectId of the job
 * @returns {Promise<Object|null>} - Job document or null if not found
 */
export const findJobById = async (id) => {
  return Job.findById(id);
};

/**
 * Update a job by its ID
 * @param {string} id - MongoDB ObjectId of the job to update
 * @param {Object} updates - Field-value pairs to update
 * @returns {Promise<Object|null>} - Updated job document or null if not found
 */
export const updateJobById = async (id, updates) => {
  return Job.findByIdAndUpdate(
    id, 
    { ...updates, updatedAt: Date.now() }, // Spread updates and set updatedAt timestamp
    { 
      new: true,         // Return the updated document instead of the original
      runValidators: true // Run model validators on update
    }
  );
};

/**
 * Delete a job by its ID
 * @param {string} id - MongoDB ObjectId of the job to delete
 * @returns {Promise<Object|null>} - Deleted job document or null if not found
 */
export const deleteJobById = async (id) => {
  return Job.findByIdAndDelete(id);
};