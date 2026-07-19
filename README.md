# StudentMoney — Phần mềm quản lý chi tiêu cho sinh viên

Website giúp sinh viên ghi lại thu–chi hàng ngày, kiểm soát số dư và nhìn thấy thói quen chi tiêu qua biểu đồ. Dự án sử dụng **HTML/CSS/JavaScript + Node.js/Express**; dữ liệu được lưu lâu dài bằng file JSON.

## Chức năng

- Đăng ký, đăng nhập và đăng xuất tài khoản.
- Mỗi tài khoản chỉ xem và thao tác trên giao dịch của mình.
- Thêm, sửa, xóa khoản thu–chi; kiểm tra số tiền, ngày và danh mục.
- Danh mục thu/chi chọn sẵn; có mục **Khác** để người dùng tự nhập.
- Lọc theo tất cả, hôm nay, 7 ngày, tháng này hoặc khoảng ngày tự chọn.
- Tổng thu, tổng chi, số dư; biểu đồ tròn và thanh theo danh mục chi.

## Chạy dự án

```bash
npm install
npm start
```

Mở [http://localhost:3000](http://localhost:3000).

Tài khoản mẫu được tạo khi khởi động lần đầu: `sinhvien` / `sinhvien123`.

## Lưu trữ dữ liệu

- `data/users.json`: tài khoản; mật khẩu được băm bằng `scrypt` và salt riêng.
- `data/categories.json`: danh mục do quản trị viên thiết lập sẵn.
- `data/transactions.json`: giao dịch, gắn với `ownerId` của tài khoản.

Mỗi lần thao tác, backend đọc cả file JSON, thay đổi mảng dữ liệu trong bộ nhớ và ghi lại file. Xem thiết kế chi tiết ở [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md).

Xem sơ đồ thư mục và hướng dẫn đọc mã nguồn ở [docs/CODE_GUIDE.md](docs/CODE_GUIDE.md).

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/categories`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
