# Asset Management System (AM-FIE)

Hệ thống quản lý tài sản với các tính năng quản lý người dùng, tài sản, phòng ban và thông báo.

## 🚀 Tính năng chính

- **Quản lý người dùng**
  - Đăng nhập
  - Phân quyền (Admin/PowerUser/User)
  - Quản lý thông tin người dùng
  - Đặt lại mật khẩu (thông báo qua email)
  - Tạo người dùng mới ( Admin create)

- **Quản lý tài sản**
  - Thêm/Sửa/Xóa tài sản
  - Theo dõi trạng thái tài sản
  - Import/Export dữ liệu
  - Tìm kiếm và lọc tài sản

- **Quản lý phòng ban**
  - Thêm/Sửa/Xóa phòng
  - Phân bổ tài sản cho phòng
  - Theo dõi tài sản theo phòng

- **Hệ thống thông báo**
  - Thông báo realtime
  - Lịch sử thông báo

## 🛠 Công nghệ sử dụng

### Frontend
- React.js
- Vite
- TypeScript
- Tailwind CSS
- React Icons
- React Query
- React Router

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Bcrypt
- Nodemailer
- Multer

### DevOps
- Docker
- Docker Compose
- Nginx

## 📦 Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js (v22 trở lên)
- MongoDB (v6 trở lên)
- npm hoặc yarn

### Chạy localhost

1. Clone repository:
```bash
git clone [repository-url]
cd AM-FIE
```

2. Cài đặt dependencies cho backend:
```bash
cd server
npm install
# hoặc
yarn install
```

3. Tạo file .env trong thư mục server(Dựa vào .env.sample):
```
MONGODB_URI=mongodb://localhost:27017/amfie
PORT=8080
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

4. Cài đặt dependencies cho frontend( tạo .env dựa vào .env.sample):
```bash
cd ../client
npm install
# hoặc
yarn install
```

5. Chạy backend:
```bash
cd ../server
npm run dev
# hoặc
yarn dev
```

6. Chạy frontend (trong terminal mới):
```bash
cd ../client
npm run dev
# hoặc
yarn dev
```

### Truy cập ứng dụng localhost
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### Chạy với Docker

1. Tạo file .env trong thư mục server:
```
MONGODB_URI=mongodb://mongodb:27017/amfie
PORT=8080
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

2. Build và chạy với Docker:
```bash
docker-compose up --build
```

### Truy cập ứng dụng Docker
- Frontend: http://localhost
- Backend API: http://localhost:8080

## 🔧 Các lệnh Docker hữu ích

### Quản lý container
```bash
# Xem trạng thái container
docker-compose ps

# Xem logs
docker-compose logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mongodb

# Khởi động lại service
docker-compose restart backend

# Dừng tất cả container
docker-compose down
```

### Development
```bash
# Xem logs realtime
docker-compose logs -f

# Xóa tất cả container và image
docker-compose down --rmi all

# Xóa volume
docker-compose down -v
```

### Database
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /backup

# Restore MongoDB
docker-compose exec mongodb mongorestore /backup
```

## 📚 API Documentation

### Authentication
- POST /api/auth/login - Đăng nhập
- POST /api/auth/logout - Đăng xuất
- POST /api/auth/refresh - Làm mới token

### Users
- GET /api/users - Lấy danh sách users
- GET /api/users/:id - Lấy thông tin user
- PUT /api/users/:id - Cập nhật user
- DELETE /api/users/:id - Xóa user

### Assets
- GET /api/asset - Lấy danh sách tài sản
- POST /api/asset - Thêm tài sản mới
- PUT /api/asset/:id - Cập nhật tài sản
- DELETE /api/asset/:id - Xóa tài sản

### Rooms
- GET /api/room - Lấy danh sách phòng
- POST /api/room - Thêm phòng mới
- PUT /api/room/:id - Cập nhật phòng
- DELETE /api/room/:id - Xóa phòng

## 🔐 Bảo mật

- JWT Authentication
- Password Hashing với Bcrypt
- CORS Configuration
- Secure Cookies
- Input Validation
- Rate Limiting

## 📝 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👥 Tác giả

Nguyen Thanh Hieu 