const mongoose = require('mongoose');

const vectorEmbeddingSchema = new mongoose.Schema({
  // Object identifier
  objectId: {
    type: String,
    required: true,
    index: true,
    description: "ID of the related object (asset, room, user)"
  },
  // Type of embedded object
  objectType: {
    type: String,
    required: true,
    enum: ['asset', 'room', 'user', 'index_status'],
    description: "Type of object this embedding represents"
  },
  // Vector embedding
  vector: {
    type: [Number],
    required: true,
    description: "Vector representation (embedding)"
  },
  // Content used to generate the embedding (for retrieval)
  content: {
    type: String,
    description: "Original text content used to generate the embedding"
  },
  // Additional metadata
  metadata: {
    type: Object,
    default: {},
    description: "Additional data about the embedding"
  },
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create index for vector search
// NOTE: You'll need to create the vector search index in MongoDB Atlas UI
// or via Atlas API, as Mongoose doesn't support creating vector indexes directly

const VectorEmbedding = mongoose.model('VectorEmbedding', vectorEmbeddingSchema);

module.exports = VectorEmbedding;