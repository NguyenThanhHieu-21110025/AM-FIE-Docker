const ChatSession = require("../models/chatSessionModel");
const Asset = require("../models/assetModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const geminiService = require("../services/geminiService");
const mongoVectorService = require("../services/mongoVectorService");
const vectorUtils = require("../utils/vectorUtils");
const mongoose = require("mongoose");

class ChatbotController {
  constructor() {
    this.ChatSession = ChatSession;
    this.Asset = Asset;
    this.Room = Room;
    this.User = User;
    this.geminiService = geminiService;
    this.vectorService = mongoVectorService;

    // Khởi tạo vector cho dữ liệu hệ thống khi controller được tạo
    this.ensureSystemDataIndexed();
  }

  // Khởi tạo và đảm bảo dữ liệu hệ thống được Indexed trong Pinecone
  async ensureSystemDataIndexed() {
    try {
      const indexStatus = await this.vectorService.checkIndexStatus();
  
      // Nếu chỉ mục chưa được tạo, hoặc cần tái tạo, thực hiện Indexed
      if (!indexStatus.isIndexed) {
        console.log("Indexing system data in MongoDB Atlas...");
  
        // Indexed tất cả dữ liệu tài sản
        await this.indexAllAssets();
  
        // Indexed dữ liệu phòng
        await this.indexAllRooms();
  
        // Indexed tất cả dữ liệu người dùng
        await this.indexAllUsers();
  
        // Cập nhật trạng thái Indexed
        await this.vectorService.updateIndexStatus(true);
        console.log("System data indexing completed.");
      }
    } catch (error) {
      console.error("Error initializing system data vectors:", error);
      // Không throw exception để tránh làm gián đoạn quá trình khởi tạo
    }
  }

  // Đánh chỉ mục tất cả tài sản
  async indexAllAssets() {
    try {
      const assets = await this.Asset.find()
        .populate("location")
        .populate("responsible_user");

      for (const asset of assets) {
        await this.indexAsset(asset);
      }

      console.log(`Indexed ${assets.length} assets in Pinecone.`);
    } catch (error) {
      console.error("Error indexing assets:", error);
    }
  }

  // Đánh chỉ mục cho một tài sản
  async indexAsset(asset) {
    try {
      // Create content string for asset
      const assetContent = `
        Mã tài sản: ${asset.asset_code}
        Tên tài sản: ${asset.asset_name}
        Đặc điểm: ${asset.specifications || "N/A"}
        Năm sử dụng: ${asset.year_of_use || "N/A"}
        Số lượng: ${asset.accounting?.quantity || "N/A"}
        Đơn giá: ${asset.accounting?.unit_price || "N/A"}
        Nguyên giá: ${asset.accounting?.origin_price || "N/A"}
        Tỷ lệ hao mòn: ${asset.depreciation_rate || "N/A"}%
        Giá trị còn lại: ${asset.remaining_value || "N/A"}
        Vị trí: ${
          asset.location
            ? `${asset.location.building} - ${asset.location.name}`
            : "Không xác định"
        }
        Người phụ trách: ${
          asset.responsible_user
            ? asset.responsible_user.name
            : "Không xác định"
        }
      `;

      // Generate and store vector in MongoDB
      const vector = this.vectorService.generateEmbedding(assetContent);
      await this.vectorService.upsertVector(
        `asset-${asset._id}`,
        "asset",
        vector,
        assetContent,
        {
          asset_id: asset._id.toString(),
          asset_code: asset.asset_code,
          asset_name: asset.asset_name,
          location: asset.location
            ? `${asset.location.building}-${asset.location.name}`
            : "Unknown",
        }
      );
    } catch (error) {
      console.error(`Error indexing asset ${asset._id}:`, error);
    }
  }

  // Đánh chỉ mục tất cả phòng
  async indexAllRooms() {
    try {
      const rooms = await this.Room.find().populate("responsible_user");

      for (const room of rooms) {
        await this.indexRoom(room);
      }

      console.log(`Indexed ${rooms.length} rooms in Pinecone.`);
    } catch (error) {
      console.error("Error indexing rooms:", error);
    }
  }

  // Đánh chỉ mục cho một phòng
  async indexRoom(room) {
    try {
      // Tạo content string cho room
      const roomContent = `
                Phòng: ${room.name}
                Tòa nhà: ${room.building}
                Tên đầy đủ: ${room.fullName || `${room.building}-${room.name}`}
                Số lượng tài sản (sổ kế toán): ${
                  room.accountingRecords?.quantity || 0
                }
                Nguyên giá tài sản (sổ kế toán): ${
                  room.accountingRecords?.originalValue || 0
                }
                Giá trị còn lại (sổ kế toán): ${
                  room.accountingRecords?.currentValue || 0
                }
                Số lượng tài sản (kiểm kê): ${room.physicalCount?.quantity || 0}
                Người phụ trách: ${
                  room.responsible_user
                    ? room.responsible_user.name
                    : "Không xác định"
                }
            `;

      // Tạo và lưu vector
      const vector = this.vectorService.generateEmbedding(roomContent);
      await this.vectorService.upsertVector(
        `room-${room._id}`,
        "room",
        vector,
        roomContent,
        {
          type: "room",
          room_id: room._id.toString(),
          room_name: room.name,
          building: room.building,
          content: roomContent,
        }
      );
    } catch (error) {
      console.error(`Error indexing room ${room._id}:`, error);
    }
  }

  // Đánh chỉ mục tất cả người dùng
  async indexAllUsers() {
    try {
      const users = await this.User.find();

      for (const user of users) {
        await this.indexUser(user);
      }

      console.log(`Indexed ${users.length} users in Pinecone.`);
    } catch (error) {
      console.error("Error indexing users:", error);
    }
  }

  // Đánh chỉ mục cho một người dùng
  async indexUser(user) {
    try {
      // Tạo content string cho user
      const userContent = `
                Tên: ${user.name}
                Email: ${user.email}
                Số điện thoại: ${user.phoneNumber || "N/A"}
                Chức vụ: ${user.position || "N/A"}
                ID người dùng: ${user.userid || "N/A"}
                Trạng thái: ${
                  user.isActive ? "Đang hoạt động" : "Không hoạt động"
                }
                Vai trò: ${user.admin ? "Quản trị viên" : "Người dùng thường"}
            `;

      // Tạo và lưu vector
      const vector = this.vectorService.generateEmbedding(userContent);
      await this.vectorService.upsertVector(
        `user-${user._id}`,
        "user",
        vector,
        userContent,
        {
          type: "user",
          user_id: user._id.toString(),
          user_name: user.name,
          position: user.position || "N/A",
          content: userContent,
        }
      );
    } catch (error) {
      console.error(`Error indexing user ${user._id}:`, error);
    }
  }

  // Lấy dữ liệu liên quan từ Pinecone dựa trên câu hỏi
  async getRelevantSystemData(question) {
    try {
      const vector = this.vectorService.generateEmbedding(question);
      const results = await this.vectorService.queryVector(vector, 5);

      return results
        .filter((item) => item)
        .map((item) => ({
          type: item.objectType || "unknown",
          content: item.content || "Không có nội dung cụ thể",
          score: item.score,
        }));
    } catch (error) {
      console.error("Error getting relevant system data:", error);
      return [];
    }
  }

  // Phân tích ý định của câu hỏi
  async analyzeQuestion(question) {
    // Danh sách từ khóa và chủ đề
    const topics = {
      asset: [
        "tài sản",
        "thiết bị",
        "asset",
        "đồ đạc",
        "tài sản",
        "vật dụng",
        "đồ dùng",
        "nguyên giá",
      ],
      room: [
        "phòng",
        "room",
        "địa điểm",
        "nơi",
        "vị trí",
        "tòa nhà",
        "building",
      ],
      user: ["người dùng", "user", "nhân viên", "người phụ trách", "cán bộ"],
      value: [
        "giá trị",
        "value",
        "còn lại",
        "giá",
        "nguyên giá",
        "remaining",
        "origin",
      ],
      status: [
        "trạng thái",
        "status",
        "tình trạng",
        "hiện tại",
        "hỏng",
        "mất",
        "thất lạc",
      ],
      time: ["năm", "time", "thời gian", "ngày", "tháng", "year"],
      quantity: [
        "số lượng",
        "quantity",
        "count",
        "đếm",
        "tổng số",
        "còn lại",
        "đang còn",
      ],
    };

    // Chuyển câu hỏi sang chữ thường để tìm kiếm từ khóa dễ dàng hơn
    const lowerQuestion = question.toLowerCase();

    // Xác định các chủ đề có trong câu hỏi
    let detectedTopics = {};
    Object.entries(topics).forEach(([topic, keywords]) => {
      if (keywords.some((keyword) => lowerQuestion.includes(keyword))) {
        detectedTopics[topic] = true;
      }
    });

    // Phân tích các loại câu hỏi đặc biệt
    let specialQueries = {
      highestValue:
        lowerQuestion.includes("giá trị cao nhất") ||
        lowerQuestion.includes("đắt nhất") ||
        lowerQuestion.includes("giá trị lớn"),
      lowestValue:
        lowerQuestion.includes("giá trị thấp nhất") ||
        lowerQuestion.includes("rẻ nhất") ||
        lowerQuestion.includes("ít giá trị"),
      mostQuantity:
        lowerQuestion.includes("nhiều nhất") ||
        lowerQuestion.includes("số lượng lớn"),
      missing:
        lowerQuestion.includes("thiếu") ||
        lowerQuestion.includes("mất") ||
        lowerQuestion.includes("thất lạc"),
      recent:
        lowerQuestion.includes("gần đây") ||
        lowerQuestion.includes("mới nhất") ||
        lowerQuestion.includes("năm nay"),
      byRoom:
        lowerQuestion.match(/phòng\s+(\w+)/i) ||
        lowerQuestion.match(/tại\s+phòng\s+(\w+)/i),
    };

    // Phân tích các mã tài sản hoặc số phòng cụ thể được đề cập
    let specificIds = {
      assetCode:
        lowerQuestion.match(/mã\s+(\w+)/i) ||
        lowerQuestion.match(/asset_code\s+(\w+)/i) ||
        lowerQuestion.match(/mã tài sản\s+(\w+)/i),
      roomName:
        lowerQuestion.match(/phòng\s+(\w+)/i) ||
        lowerQuestion.match(/room\s+(\w+)/i),
    };

    // Tìm năm nếu được đề cập
    const yearMatch =
      lowerQuestion.match(/năm\s+(\d{4})/i) || lowerQuestion.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    return {
      topics: detectedTopics,
      specialQueries,
      specificIds: {
        assetCode: specificIds.assetCode ? specificIds.assetCode[1] : null,
        roomName: specificIds.roomName ? specificIds.roomName[1] : null,
      },
      year,
    };
  }

  // Truy vấn dữ liệu tài sản dựa trên phân tích câu hỏi
  async queryAssets(analysis) {
    let query = {};
    let sortOptions = {};
    let limit = 99999; // Mặc định lấy 5 kết quả

    // Nếu có mã tài sản cụ thể
    if (analysis.specificIds.assetCode) {
      query.asset_code = new RegExp(analysis.specificIds.assetCode, "i");
    }

    // Nếu có phòng cụ thể, đầu tiên tìm phòng
    if (analysis.specificIds.roomName) {
      const rooms = await this.Room.find({
        name: new RegExp(analysis.specificIds.roomName, "i"),
      });

      if (rooms.length > 0) {
        // Lấy tất cả ID phòng phù hợp
        const roomIds = rooms.map((room) => room._id);
        query.location = { $in: roomIds };
      }
    }

    // Nếu có năm cụ thể
    if (analysis.year) {
      query.year_of_use = analysis.year;
    }

    // Các truy vấn đặc biệt
    if (analysis.specialQueries.highestValue) {
      sortOptions.remaining_value = -1; // Sắp xếp giảm dần theo giá trị còn lại
      limit = 3; // Lấy top 3
    } else if (analysis.specialQueries.lowestValue) {
      sortOptions.remaining_value = 1; // Sắp xếp tăng dần theo giá trị còn lại
      limit = 3;
    } else if (analysis.specialQueries.mostQuantity) {
      sortOptions["accounting.quantity"] = -1; // Sắp xếp giảm dần theo số lượng
      limit = 3;
    } else if (analysis.specialQueries.missing) {
      query["quantity_differential.missing_quantity"] = { $gt: 0 };
    } else if (analysis.specialQueries.recent) {
      sortOptions.year_of_use = -1; // Tài sản gần đây (năm sử dụng cao)
    }

    // Thực hiện truy vấn
    let assets;
    if (Object.keys(sortOptions).length > 0) {
      assets = await this.Asset.find(query)
        .sort(sortOptions)
        .limit(limit)
        .populate("location")
        .populate("responsible_user");
    } else {
      assets = await this.Asset.find(query)
        .limit(limit)
        .populate("location")
        .populate("responsible_user");
    }

    return this.formatAssetData(assets);
  }

  // Truy vấn dữ liệu phòng dựa trên phân tích câu hỏi
  async queryRooms(analysis) {
    let query = {};
    let sortOptions = {};
    let limit = 5;

    // Tìm phòng cụ thể nếu có
    if (analysis.specificIds.roomName) {
      query.name = new RegExp(analysis.specificIds.roomName, "i");
    }

    // Các truy vấn đặc biệt cho phòng
    if (analysis.specialQueries.mostQuantity) {
      sortOptions["accountingRecords.quantity"] = -1; // Phòng có nhiều tài sản nhất
      limit = 3;
    } else if (analysis.specialQueries.highestValue) {
      sortOptions["accountingRecords.originalValue"] = -1; // Phòng có giá trị tài sản cao nhất
      limit = 3;
    }

    // Thực hiện truy vấn
    let rooms;
    if (Object.keys(sortOptions).length > 0) {
      rooms = await this.Room.find(query)
        .sort(sortOptions)
        .limit(limit)
        .populate("responsible_user");
    } else {
      rooms = await this.Room.find(query)
        .limit(limit)
        .populate("responsible_user");
    }

    return this.formatRoomData(rooms);
  }

  // Định dạng dữ liệu tài sản để cung cấp cho chatbot
  formatAssetData(assets) {
    return assets.map((asset) => ({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      specifications: asset.specifications,
      year_of_use: asset.year_of_use,
      accounting: {
        quantity: asset.accounting?.quantity,
        unit_price: asset.accounting?.unit_price,
        origin_price: asset.accounting?.origin_price,
      },
      depreciation_rate: asset.depreciation_rate,
      remaining_value: asset.remaining_value,
      location: asset.location
        ? {
            name: asset.location.name,
            building: asset.location.building,
          }
        : "Không xác định",
      responsible_user: asset.responsible_user
        ? asset.responsible_user.name
        : "Không xác định",
    }));
  }

  // Định dạng dữ liệu phòng để cung cấp cho chatbot
  formatRoomData(rooms) {
    return rooms.map((room) => ({
      name: room.name,
      fullName: room.fullName || `${room.building}-${room.name}`,
      building: room.building,
      accountingRecords: room.accountingRecords,
      assetCount: room.assets?.length || 0,
      responsible_user: room.responsible_user
        ? room.responsible_user.name
        : "Không xác định",
    }));
  }

  // Tạo phiên chat mới
  async createSession(userId, title = "Cuộc trò chuyện mới") {
    try {
      // Validate userId before using
      const validUserId =
        userId && mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;

      // Create new MongoDB session
      const session = new this.ChatSession({
        title,
        userId: validUserId,
        messages: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await session.save();
      return session;
    } catch (error) {
      console.error("Error creating session:", error);
      throw new Error("Không thể tạo phiên chat mới");
    }
  }

  // Lấy tất cả phiên chat của người dùng
  async getUserSessions(userId) {
    try {
      if (!userId) {
        throw new Error("ID người dùng không hợp lệ");
      }

      let query = {};

      if (mongoose.Types.ObjectId.isValid(userId)) {
        // Query for both string and ObjectId representations
        query = {
          $or: [
            { userId: userId.toString() },
            { userId: new mongoose.Types.ObjectId(userId) },
          ],
        };
      } else {
        query = { userId: userId };
      }

      return await this.ChatSession.find(query)
        .sort({ updatedAt: -1 })
        .select("-messages") // Don't load all messages for performance
        .exec();
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw new Error("Không thể lấy danh sách phiên chat");
    }
  }
  // Lấy chi tiết phiên chat
  async getSessionDetail(sessionId) {
    try {
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new Error("ID phiên chat không hợp lệ");
      }

      const session = await this.ChatSession.findById(
        new mongoose.Types.ObjectId(sessionId)
      );

      if (!session) {
        throw new Error("Không tìm thấy phiên chat");
      }

      return session;
    } catch (error) {
      console.error("Error getting session detail:", error);
      throw new Error("Không thể lấy thông tin phiên chat");
    }
  }
  async updateSession(sessionId, sessionData) {
    try {
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new Error("ID phiên chat không hợp lệ");
      }

      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);

      // Remove _id from sessionData if present to avoid modification error
      if (sessionData._id) {
        delete sessionData._id;
      }

      // Ensure we don't overwrite userId
      delete sessionData.userId;

      // Update the session with new data
      const updatedSession = await this.ChatSession.findByIdAndUpdate(
        sessionObjectId,
        {
          $set: {
            ...sessionData,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error("Không tìm thấy phiên chat để cập nhật");
      }

      return updatedSession;
    } catch (error) {
      console.error("Error updating session:", error);
      throw new Error("Không thể cập nhật phiên chat");
    }
  }
  // Xóa phiên chat
  async deleteSession(sessionId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new Error("ID phiên chat không hợp lệ");
      }

      const result = await this.ChatSession.deleteOne({
        _id: new mongoose.Types.ObjectId(sessionId),
      });

      if (result.deletedCount === 0) {
        throw new Error("Không thể xóa phiên chat");
      }

      return { success: true, message: "Đã xóa phiên chat" };
    } catch (error) {
      console.error("Error deleting session:", error);
      throw new Error(`Không thể xóa phiên chat: ${error.message}`);
    }
  }

  // Phương thức chính xử lý đầu vào của người dùng
  async processUserInput(userMessage, sessionId = null, userId = null) {
    try {
      let session;

      // Handle session initialization
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        // Create new session if no valid sessionId
        session = await this.createSession(userId);
        sessionId = session._id;
      } else {
        // Try to get existing session
        try {
          session = await this.ChatSession.findById(sessionId);

          if (!session) {
            // If not found, create a new one
            session = await this.createSession(userId);
            sessionId = session._id;
          }
        } catch (error) {
          // Handle error by creating a new session
          console.error("Error retrieving session:", error);
          session = await this.createSession(userId);
          sessionId = session._id;
        }
      }

      // Add user message to session
      const userMessageObj = {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };

      // Initialize messages array if needed
      if (!session.messages) {
        session.messages = [];
      }

      // Add user message to chat history
      session.messages.push(userMessageObj);

      // Update session title if this is the first message
      if (session.messages.length === 1) {
        session.title =
          userMessage.length > 50
            ? userMessage.substring(0, 47) + "..."
            : userMessage;
      }

      // Process the user's query
      const analysis = await this.analyzeQuestion(userMessage);
      const relevantSystemData = await this.getRelevantSystemData(userMessage);

      // Build context data
      let contextData = {};
      let additionalContext = "";

      // Process asset data if needed
      if (analysis.topics.asset) {
        const assetData = await this.queryAssets(analysis);
        contextData.assets = assetData;

        const assetCount = await this.Asset.countDocuments();
        additionalContext += `\nThống kê: Hệ thống có ${assetCount} tài sản. `;

        // Add statistics about all assets for better value-related queries
        if (analysis.topics.value || analysis.specialQueries.highestValue) {
          const highestValueAsset = await this.Asset.findOne().sort({
            remaining_value: -1,
          });
          additionalContext += `\nTài sản có giá trị cao nhất: ${
            highestValueAsset?.asset_name || "Không xác định"
          } (${highestValueAsset?.remaining_value || 0}).`;
        }

        if (assetData.length > 0) {
          additionalContext += `\nDữ liệu tài sản liên quan: ${JSON.stringify(
            assetData,
            null,
            2
          )}\n`;
        }
      }

      // Process room data if needed
      if (analysis.topics.room) {
        const roomData = await this.queryRooms(analysis);
        contextData.rooms = roomData;

        const roomCount = await this.Room.countDocuments();
        additionalContext += `\nThống kê: Hệ thống có ${roomCount} phòng. `;

        if (roomData.length > 0) {
          additionalContext += `\nDữ liệu phòng liên quan: ${JSON.stringify(
            roomData,
            null,
            2
          )}\n`;
        }
      }

      // Process user data if needed
      if (analysis.topics.user) {
        const users = await this.User.find().limit(3);
        contextData.users = users.map((user) => ({
          name: user.name,
          position: user.position,
          isActive: user.isActive,
        }));

        additionalContext += `\nDữ liệu người dùng: ${JSON.stringify(
          contextData.users,
          null,
          2
        )}\n`;
      }

      // Get conversation history context
      const sessionHistory = this.getSessionContext(session);

      // Prepare vector context
      const vectorContext = relevantSystemData
        .map((item, index) => {
          if (!item || !item.type) {
            return `[Tài liệu liên quan ${
              index + 1
            }]: Không có thông tin cụ thể`;
          }
          return `[Tài liệu liên quan ${
            index + 1
          }] ${item.type.toUpperCase()}:\n${
            item.content || "Không có nội dung"
          }\n`;
        })
        .join("\n");

      // Build prompt with rich context
      const contextualPrompt = `
Dữ liệu từ hệ thống quản lý tài sản HCMUTE:
${additionalContext}

Thông tin liên quan từ cơ sở dữ liệu:
${vectorContext}

Lịch sử cuộc hội thoại hiện tại:
${sessionHistory}

Câu hỏi hiện tại của người dùng: ${userMessage}

Hãy trả lời dựa trên dữ liệu được cung cấp ở trên. Nếu không đủ thông tin, hãy cho biết cần thêm thông tin gì.`;

      // Get response from Gemini
      const botResponse = await this.geminiService.getResponse(
        contextualPrompt
      );

      // Add bot response to session
      const botMessageObj = {
        role: "assistant",
        content: botResponse,
        timestamp: new Date(),
        metadata: {
          analysis: analysis,
          contextData: contextData,
          relevantSystemData: relevantSystemData.map((item) => ({
            type: item.type,
            score: item.score,
          })),
        },
      };

      session.messages.push(botMessageObj);
      session.updatedAt = new Date();

      // Save updated session
      await session.save();

      return {
        response: botResponse,
        sessionId: session._id.toString(),
      };
    } catch (error) {
      console.error("Error processing user input:", error);
      throw new Error("Xảy ra lỗi khi xử lý câu hỏi của bạn");
    }
  }

  // Lấy ngữ cảnh từ phiên trò chuyện (không cần truy vấn DB vì messages đã có trong session)
  getSessionContext(session) {
    try {
      if (!session.messages || session.messages.length === 0) {
        return "";
      }

      // Get up to 10 most recent messages
      const recentMessages = session.messages.slice(-10);

      return recentMessages
        .map(
          (msg) =>
            `${msg.role === "user" ? "Người dùng" : "Trợ lý"}: ${msg.content}`
        )
        .join("\n\n");
    } catch (error) {
      console.error("Error getting session context:", error);
      return "";
    }
  }

  // Phương thức lấy lịch sử chat với giao diện tương thích cũ
  async getChatHistory(userId = null) {
    try {
      let query = {};
      if (userId) {
        query.userId = mongoose.Types.ObjectId(userId);
      }

      const sessions = await this.ChatSession.find(query)
        .sort({ updatedAt: -1 })
        .limit(20);

      // Chuyển đổi sang định dạng tương thích với giao diện cũ
      let result = [];

      for (const session of sessions) {
        if (session.messages && session.messages.length > 0) {
          for (const msg of session.messages) {
            result.push({
              _id: msg._id || new mongoose.Types.ObjectId(),
              userInput: msg.role === "user" ? msg.content : "",
              botResponse: msg.role === "assistant" ? msg.content : "",
              timestamp: msg.timestamp,
              sessionId: session._id,
              metadata: {
                ...msg.metadata,
                sessionTitle: session.title,
              },
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw new Error("Không thể lấy lịch sử trò chuyện");
    }
  }

  // Cập nhật vector index khi tài sản được thêm hoặc cập nhật
  async updateAssetVector(assetId) {
    try {
      const asset = await this.Asset.findById(assetId)
        .populate("location")
        .populate("responsible_user");

      if (asset) {
        await this.indexAsset(asset);
        console.log(`Updated vector for asset ${assetId}`);
      }
    } catch (error) {
      console.error(`Error updating asset vector ${assetId}:`, error);
    }
  }

  // Cập nhật vector index khi phòng được thêm hoặc cập nhật
  async updateRoomVector(roomId) {
    try {
      const room = await this.Room.findById(roomId).populate(
        "responsible_user"
      );

      if (room) {
        await this.indexRoom(room);
        console.log(`Updated vector for room ${roomId}`);
      }
    } catch (error) {
      console.error(`Error updating room vector ${roomId}:`, error);
    }
  }

  // Cập nhật vector index khi người dùng được thêm hoặc cập nhật
  async updateUserVector(userId) {
    try {
      const user = await this.User.findById(userId);

      if (user) {
        await this.indexUser(user);
        console.log(`Updated vector for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error updating user vector ${userId}:`, error);
    }
  }
}

module.exports = ChatbotController;
