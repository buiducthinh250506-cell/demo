# Thiết kế dữ liệu — StudentMoney

## Mô hình logic

Project dùng File Storage nên mỗi thực thể được lưu ở một file JSON. Về mặt thiết kế, cấu trúc tương đương các bảng dữ liệu sau:

```text
users (1) ──────< (n) transactions (n) >────── (1) categories
                     ownerId       categoryId
```

Mỗi giao dịch thuộc duy nhất một người dùng. Danh mục là tập dùng chung do quản trị viên tạo sẵn. Nếu người dùng chọn **Khác**, `categoryId` là `other` và tên tự nhập được lưu trong `category`.

## `users.json` — Tài khoản

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `id` | UUID/string | Khóa chính |
| `username` | string | Duy nhất; 4–30 ký tự chữ/số/gạch dưới |
| `fullName` | string | Bắt buộc; 2–60 ký tự |
| `email` | string | Duy nhất; định dạng email |
| `passwordHash` | string | Mật khẩu đã băm với `scrypt` |
| `passwordSalt` | string | Salt riêng cho từng tài khoản |
| `createdAt` | ISO datetime | Thời điểm đăng ký |

Không lưu mật khẩu gốc trong file.

## `categories.json` — Danh mục có sẵn

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `id` | string | Khóa chính, ví dụ `exp-food` |
| `name` | string | Tên hiển thị |
| `type` | enum | `income` hoặc `expense` |
| `sortOrder` | number | Thứ tự hiển thị |
| `active` | boolean | `true` để hiện trên biểu mẫu |

Ví dụ: `{ "id": "exp-food", "name": "Ăn uống", "type": "expense", "sortOrder": 1, "active": true }`.

## `transactions.json` — Giao dịch

| Trường | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `id` | UUID/string | Khóa chính |
| `ownerId` | string | Khóa ngoại logic đến `users.id` |
| `type` | enum | `income` hoặc `expense` |
| `categoryId` | string | Khóa ngoại logic đến `categories.id`, hoặc `other` |
| `category` | string | Tên danh mục tại thời điểm ghi |
| `amount` | integer | Lớn hơn 0 |
| `date` | `YYYY-MM-DD` | Ngày giao dịch hợp lệ |
| `note` | string | Tối đa 160 ký tự, không bắt buộc |
| `createdAt` | ISO datetime | Thời điểm tạo bản ghi |

## Quy tắc nghiệp vụ

1. Tên đăng nhập và email không được trùng.
2. Khi đăng nhập, backend đối chiếu mật khẩu đã băm và trả về token phiên.
3. Mọi API giao dịch yêu cầu token; server luôn lọc `ownerId`, nên không thể đọc/sửa giao dịch của tài khoản khác.
4. Danh mục có sẵn phải cùng loại với giao dịch. Backend lấy tên danh mục từ `categories.json`, không tin tên do trình duyệt gửi.
5. Với `categoryId: "other"`, `customCategory` là bắt buộc; server lưu nó thành `category`.
6. Số tiền là số nguyên dương; ngày đúng định dạng; ghi chú không quá 160 ký tự.

## Luồng ghi dữ liệu

```text
Client gửi yêu cầu + token
          ↓
Server xác thực tài khoản và kiểm tra dữ liệu
          ↓
Đọc toàn bộ file JSON liên quan
          ↓
Thêm / sửa / xóa trong mảng bộ nhớ
          ↓
Ghi đè file JSON với định dạng dễ đọc
```

Mô hình này phù hợp bài tập và lượng dữ liệu nhỏ. Khi cần nhiều người dùng ghi đồng thời, nên chuyển sang SQLite/MySQL để có khóa ngoại thật, giao dịch (transaction) và kiểm soát cạnh tranh.
