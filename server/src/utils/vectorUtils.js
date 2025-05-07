// This file contains utility functions for handling vector operations, such as converting chat messages into vectors and performing similarity searches in the Pinecone database.

const mongoVectorService = require('../services/mongoVectorService');

/**
 * Converts a chat message into a vector representation
 * @param {string} message - The message to convert to a vector
 * @returns {number[]} The vector representation of the message
 */
function messageToVector(message) {   
    return mongoVectorService.generateEmbedding(message);
  }

/**
 * Finds similar messages based on vector similarity
 * @param {number[]} vector - The vector to query against
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Array of similar messages with scores
 */
async function findSimilarMessages(vector, topK = 5) {
    const results = await mongoVectorService.queryVector(vector, topK);
    return results;
  }

/**
 * Normalizes a vector to unit length
 * @param {number[]} vector - The vector to normalize
 * @returns {number[]} The normalized vector
 */
function normalizeVector(vector) {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / norm);
}

/**
 * Processes a message for RAG (Retrieval Augmented Generation)
 * @param {string} message - The user message to process
 * @returns {Promise<Array>} Array of relevant context from the vector database
 */
async function getRelevantContext(message) {
    const vector = messageToVector(message);
    const similar = await findSimilarMessages(vector);
    return similar;
}

module.exports = {
    messageToVector,
    findSimilarMessages,
    normalizeVector,
    getRelevantContext
};