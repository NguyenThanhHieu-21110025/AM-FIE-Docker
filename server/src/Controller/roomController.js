const Room = require("../models/roomModel");
const {
  createRoomNotification,
  createNotification,
} = require("./notificationController");

const roomController = {
  createRoom: async (req, res) => {
    try {
      // Tạo phòng mới với các trường bắt buộc và các trường mặc định
      const room = new Room({
        name: req.body.name,
        building: req.body.building,
        responsible_user: req.body.responsible_user,
        note: req.body.note,
        // Các trường khác sẽ được tự động khởi tạo với giá trị mặc định
      });

      await room.save();

      await createRoomNotification({
        message: `Phòng mới "${room.fullName}" đã được tạo`,
        roomId: room._id,
      });

      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getAllRoom: async (req, res) => {
    try {
      // Lấy danh sách phòng và populate tài sản và người dùng
      const rooms = await Room.find()
        .populate("assets")
        .populate("responsible_user");
      res.status(200).json(rooms);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getRoomById: async (req, res) => {
    try {
      const room = await Room.findById(req.params.id)
        .populate("assets")
        .populate("responsible_user");

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.status(200).json(room);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateRoom: async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Cập nhật phòng với dữ liệu mới
      await room.updateOne({
        $set: {
          ...req.body,
          updated_at: new Date(),
        },
      });

      // Lấy phòng đã cập nhật để trả về
      const updatedRoom = await Room.findById(req.params.id);

      await createRoomNotification({
        message: `Phòng "${updatedRoom.fullName}" đã được cập nhật`,
        roomId: updatedRoom._id,
      });

      res.status(200).json(updatedRoom);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteRoom: async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Kiểm tra nếu phòng đang có tài sản
      if (room.assets && room.assets.length > 0) {
        return res.status(400).json({
          error:
            "Cannot delete room with assets. Move or delete the assets first.",
        });
      }

      // Lưu thông tin của phòng và người quản lý trước khi xóa
      const roomName = room.fullName;
      const responsibleUserId = room.responsible_user;

      // Xóa phòng
      await Room.findByIdAndDelete(req.params.id);

      // Với phòng đã xóa, cần logic đặc biệt để thêm người quản lý vào thông báo (nếu là powerUser)
      let additionalRecipients = [];

      if (responsibleUserId) {
        // Kiểm tra xem người quản lý có phải là powerUser không
        const responsibleUser = await User.findById(responsibleUserId);
        if (responsibleUser) {
          additionalRecipients.push(responsibleUser._id);
        }
      }

      // Sử dụng createNotification vì phòng đã bị xóa (không thể sử dụng createRoomNotification)
      await createNotification({
        message: `Phòng "${roomName}" đã bị xóa khỏi hệ thống`,
        type: "room",
        additionalRecipients, // Thêm người quản lý vào danh sách nhận thông báo
      });

      res.status(200).json({ message: "Room deleted successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = roomController;
