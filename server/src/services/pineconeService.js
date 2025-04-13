const { Pinecone } = require('@pinecone-database/pinecone');

// Configure client with API key
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

// Initialize the client
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Create a reference to the index
let index;

async function initPinecone() {
  if (!PINECONE_API_KEY || !PINECONE_INDEX) {
    throw new Error('Pinecone configuration is missing');
  }
  
  // Get a reference to the index
  index = pinecone.index(PINECONE_INDEX);
  console.log('Pinecone client initialized successfully');
}

async function upsertVector(vectorId, vectorData, metadata = {}) {
  if (!index) await initPinecone();
  
  await index.upsert([
    {
      id: vectorId,
      values: vectorData,
      metadata
    }
  ]);
}

async function queryVector(vectorData, topK = 5) {
  if (!index) await initPinecone();
  
  const queryResponse = await index.query({
    vector: vectorData,
    topK,
    includeValues: true,
    includeMetadata: true
  });
  
  return queryResponse.matches;
}

/**
 * Generates an embedding for text input
 * In production, you would use a real embedding model
 */
function generateEmbedding(text) {
  // Mock implementation with random vector
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
 * Store vector with associated conversation data
 */
async function storeVector(userInput, botResponse) {
  const combinedText = userInput + " " + botResponse;
  const vector = generateEmbedding(combinedText);
  const id = Date.now().toString();
  
  await upsertVector(id, vector, {
    userInput,
    botResponse,
    timestamp: new Date().toISOString()
  });
  
  return id;
}
// Lưu trữ trạng thái đánh chỉ mục trong một bản ghi đặc biệt
async function checkIndexStatus() {
  if (!index) await initPinecone();
  
  try {
    // Tạo vector có ít nhất một giá trị không phải 0
    const statusVector = Array(768).fill(0);
    statusVector[0] = 0.1; // Đảm bảo có 1 giá trị khác 0
    
    const statusResponse = await index.query({
      vector: statusVector,
      filter: { type: "index_status" },
      topK: 1,
      includeMetadata: true
    });
    
    if (statusResponse.matches && statusResponse.matches.length > 0) {
      return {
        isIndexed: statusResponse.matches[0].metadata.isIndexed,
        lastIndexed: statusResponse.matches[0].metadata.lastIndexed
      };
    }
    
    return { isIndexed: false };
  } catch (error) {
    console.error("Error checking index status:", error);
    return { isIndexed: false, error: error.message };
  }
}

// Sửa hàm updateIndexStatus
async function updateIndexStatus(isIndexed) {
  if (!index) await initPinecone();
  
  // Tạo vector có ít nhất một giá trị không phải 0
  const statusVector = Array(768).fill(0);
  statusVector[0] = 0.1; // Đảm bảo có 1 giá trị khác 0
  
  await upsertVector('index_status', statusVector, {
    type: "index_status",
    isIndexed: isIndexed,
    lastIndexed: new Date().toISOString()
  });
  
  return { success: true };
}
module.exports = {
  initPinecone,
  upsertVector,
  queryVector,
  generateEmbedding,
  storeVector,
  checkIndexStatus,
  updateIndexStatus
};