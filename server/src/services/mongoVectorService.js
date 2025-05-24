const VectorEmbedding = require('../models/vectorEmbeddingModel');

/**
 * Tạo embedding (biểu diễn vector) cho nội dung văn bản
 * Trong môi trường sản phẩm, bạn nên tích hợp với một API mô hình embedding
 * @param {string} text - Văn bản cần chuyển đổi thành vector embedding
 */
function generateEmbedding(text) {
  // Triển khai giả lập với vector ngẫu nhiên - cần thay thế bằng API embedding thực tế
  const dimensions = 768;
  const embedding = Array(dimensions).fill(0).map(() => Math.random() - 0.5);
  return normalizeVector(embedding);
}

/**
 * Chuẩn hóa vector về độ dài đơn vị
 */
function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / norm);
}

/**
 * Lưu trữ vector embedding trong MongoDB
 * @param {string} objectId - ID của đối tượng liên quan
 * @param {string} objectType - Loại đối tượng
 * @param {number[]} vector - Vector embedding
 * @param {string} content - Nội dung văn bản gốc
 * @param {object} metadata - Thông tin metadata bổ sung
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
    console.error("Lỗi khi cập nhật vector:", error);
    throw error;
  }
}

/**
 * Truy vấn các vector tương tự sử dụng MongoDB Atlas vector search
 * @param {number[]} vector - Vector truy vấn
 * @param {number} limit - Số lượng kết quả trả về
 */
async function queryVector(vector, limit = 5) {
  try {
    // Sử dụng hàm tổng hợp $vectorSearch của MongoDB Atlas
    // Lưu ý: Bạn phải tạo chỉ mục tìm kiếm vector trong MongoDB Atlas
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
    console.error("Lỗi khi truy vấn vector:", error);
    // Phương án dự phòng nếu tìm kiếm vector thất bại
    return [];
  }
}

/**
 * Kiểm tra xem dữ liệu hệ thống đã được lập chỉ mục chưa
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
    console.error("Lỗi khi kiểm tra trạng thái chỉ mục:", error);
    return { isIndexed: false, error: error.message };
  }
}

/**
 * Cập nhật trạng thái lập chỉ mục
 */
async function updateIndexStatus(isIndexed) {
  try {
    const statusVector = Array(768).fill(0);
    statusVector[0] = 0.1;
    
    await upsertVector(
      'index_status',
      'index_status',
      statusVector,
      'Trạng thái lập chỉ mục hệ thống',
      {
        isIndexed,
        lastIndexed: new Date().toISOString()
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái chỉ mục:", error);
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