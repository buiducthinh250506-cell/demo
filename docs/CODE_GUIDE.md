# Hướng dẫn đọc mã nguồn

## Cấu trúc thư mục

```text
demo/
├── data/                         # Dữ liệu JSON được lưu lâu dài
│   ├── users.json
│   ├── categories.json
│   └── transactions.json
├── public/                       # Giao diện trình duyệt
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/                          # Logic backend
│   ├── data-store.js
│   ├── auth.js
│   ├── transactions.js
│   └── routes/
│       ├── auth-routes.js
│       └── transaction-routes.js
└── server.js                     # Điểm khởi động Express
```

## Backend

### `server.js`

Khởi tạo Express, phục vụ thư mục `public`, gắn các route API và khởi động ứng dụng. File này chỉ điều phối, không chứa logic nghiệp vụ chi tiết.

### `src/data-store.js`

Là lớp duy nhất đọc/ghi JSON. Các hàm quan trọng:

- `readUsers()` / `saveUsers()`
- `readTransactions()` / `saveTransactions()`
- `readActiveCategories()`

Khi CRUD giao dịch, route lấy mảng giao dịch bằng `readTransactions()`, thay đổi mảng và dùng `saveTransactions()` để ghi lại toàn bộ `transactions.json`.

### `src/auth.js`

Chứa toàn bộ xác thực: băm mật khẩu `scrypt`, tạo token phiên, middleware `requireAuth` và kiểm tra dữ liệu đăng ký. Mọi route thu–chi đều phải đi qua `requireAuth`, từ đó có `request.userId`.

### `src/transactions.js`

Kiểm tra dữ liệu giao dịch và tạo đối tượng giao dịch chuẩn. Backend xác thực danh mục tồn tại, đúng loại thu/chi, số tiền là số nguyên dương và ngày hợp lệ.

### `src/routes/auth-routes.js`

Các endpoint `/api/auth/register`, `/login`, `/logout`, `/me`.

### `src/routes/transaction-routes.js`

Các endpoint danh mục và CRUD giao dịch. Mọi truy vấn đều lọc theo `ownerId === request.userId`, nên tài khoản A không thấy hay sửa được dữ liệu của tài khoản B.

## Frontend

### `public/index.html`

Chỉ mô tả cấu trúc giao diện: màn hình đăng nhập/đăng ký, dashboard, biểu mẫu giao dịch, bảng lịch sử và vùng biểu đồ.

### `public/app.js`

Được tách thành các nhóm hàm:

- **Tiện ích**: `formatMoney`, `escapeHtml`, `getLocalDate`.
- **Gọi API**: `request` tự gắn token vào header `Authorization`.
- **Xác thực**: `handleLogin`, `handleRegister`, `handleLogout`, `restoreSession`.
- **Giao dịch**: `saveTransaction`, `editTransaction`, `deleteTransaction`, `resetTransactionForm`.
- **Hiển thị**: `renderDashboard`, `renderCharts`, `renderTransactionList`.
- **Sự kiện**: `bindEvents` gom mọi `addEventListener` vào một chỗ.

## Luồng khi thêm một khoản chi

```text
1. Người dùng điền biểu mẫu và nhấn “Lưu giao dịch”.
2. app.js: saveTransaction() gửi POST /api/transactions + token.
3. requireAuth kiểm tra token và nhận diện người dùng.
4. validateTransaction() kiểm tra số tiền, ngày, danh mục.
5. buildTransaction() gắn ownerId và chuẩn hóa dữ liệu.
6. Route đọc transactions.json, thêm phần tử và ghi lại file.
7. API trả JSON giao dịch mới; app.js cập nhật giao diện và biểu đồ.
```
