const VectorEmbedding = require('../models/vectorEmbeddingModel');

/**
 * Generate embedding for text content
 * In production, you would integrate with an embedding model API
 * @param {string} text - Text to convert to vector embedding
 */
function generateEmbedding(text) {
  // Mock implementation with random vector - replace with actual embedding API
  const dimensions = 768;
  const embedding = Array(dimensions).fill(0).map(() => Math.random() - 0.5);
  return normalizeVector(embedding);
}

/**
 * Normalizes a vector to unit length
 */
function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / norm);
}

/**
 * Store vector embedding in MongoDB
 * @param {string} objectId - ID of the related object
 * @param {number[]} vector - Vector embedding
 * @param {object} metadata - Additional metadata
 */
async function upsertVector(objectId, objectType, vector, content, metadata = {}) {
  try {
    await VectorEmbedding.findOneAndUpdate(
      { objectId, objectType },
      { 
        vector, 
        content, 
        metadata,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return { success: true };
  } catch (error) {
    console.error("Error upserting vector:", error);
    throw error;
  }
}

/**
 * Query similar vectors using MongoDB Atlas vector search
 * @param {number[]} vector - Query vector
 * @param {number} limit - Number of results to return
 */
async function queryVector(vector, limit = 5) {
  try {
    // Using MongoDB Atlas $vectorSearch aggregation
    // Note: You must create a vector search index in MongoDB Atlas
    const results = await VectorEmbedding.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "vector",
          queryVector: vector,
          numCandidates: limit * 10,
          limit: limit
        }
      },
      {
        $project: {
          _id: 1,
          objectId: 1,
          objectType: 1,
          content: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);
    
    return results;
  } catch (error) {
    console.error("Error querying vectors:", error);
    // Fallback to simpler query if vector search fails
    return [];
  }
}

/**
 * Check if system data has been indexed
 */
async function checkIndexStatus() {
  try {
    const status = await VectorEmbedding.findOne({ objectType: "index_status" });
    if (status) {
      return {
        isIndexed: status.metadata.isIndexed,
        lastIndexed: status.metadata.lastIndexed
      };
    }
    return { isIndexed: false };
  } catch (error) {
    console.error("Error checking index status:", error);
    return { isIndexed: false, error: error.message };
  }
}

/**
 * Update indexing status
 */
async function updateIndexStatus(isIndexed) {
  try {
    const statusVector = Array(768).fill(0);
    statusVector[0] = 0.1;
    
    await upsertVector(
      'index_status',
      'index_status',
      statusVector,
      'System indexing status',
      {
        isIndexed,
        lastIndexed: new Date().toISOString()
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error updating index status:", error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  normalizeVector,
  upsertVector,
  queryVector,
  checkIndexStatus,
  updateIndexStatus
};