# 📖 Hướng dẫn Setup Chi tiết

## Bước 1: Tạo Google Cloud Project và API Key

### 1.1. Truy cập Google Cloud Console

1. Mở trình duyệt và truy cập: https://console.cloud.google.com/
2. Đăng nhập bằng tài khoản Google của bạn

### 1.2. Tạo Project mới

1. Click vào dropdown **Select a project** ở góc trên bên trái
2. Click **NEW PROJECT**
3. Nhập tên project: `Agoda Price Extractor`
4. Click **CREATE**
5. Đợi vài giây để project được tạo
6. Chọn project vừa tạo từ dropdown

### 1.3. Enable Google Sheets API

1. Vào menu bên trái, chọn **APIs & Services** → **Library**
2. Trong ô tìm kiếm, gõ: `Google Sheets API`
3. Click vào **Google Sheets API** trong kết quả
4. Click nút **ENABLE** (màu xanh)
5. Đợi API được kích hoạt

### 1.4. Tạo API Key

1. Vào menu bên trái, chọn **APIs & Services** → **Credentials**
2. Click nút **+ CREATE CREDENTIALS** ở trên
3. Chọn **API key**
4. API Key sẽ được tạo và hiển thị trong popup
5. **QUAN TRỌNG**: Click vào icon 📋 để copy API Key
6. Lưu API Key này vào notepad (bạn sẽ cần nó ở bước sau)
7. (Tùy chọn) Click **RESTRICT KEY** để bảo mật:
   - Chọn **API restrictions** → **Restrict key**
   - Tick chọn **Google Sheets API**
   - Click **SAVE**

## Bước 2: Cấu hình Google Sheets

### 2.1. Mở Google Sheets

1. Truy cập: https://docs.google.com/spreadsheets/d/1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw/edit
2. Nếu bạn chưa có quyền truy cập, yêu cầu owner chia sẻ cho bạn

### 2.2. Chia sẻ Sheet (Owner làm)

1. Click nút **Share** ở góc trên bên phải
2. Chọn **Anyone with the link**
3. Chọn quyền **Editor**
4. Click **Done**

**LƯU Ý**: Nếu không muốn public, bạn có thể:
- Chia sẻ với email cụ thể
- Hoặc sử dụng OAuth2 thay vì API Key (phức tạp hơn)

## Bước 3: Cấu hình Extension

### 3.1. Cập nhật config.js

1. Mở thư mục extension: `d:\Desktop\Outsourcing-project\agoda-extension\`
2. Mở file `config.js` bằng text editor (Notepad++, VS Code, etc.)
3. Tìm dòng:
   ```javascript
   GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',
   ```
4. Thay thế `YOUR_API_KEY_HERE` bằng API Key bạn đã copy ở Bước 1.4
5. Ví dụ:
   ```javascript
   GOOGLE_API_KEY: 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   ```
6. **Save** file

### 3.2. Load Extension vào Chrome

1. Mở Chrome
2. Truy cập: `chrome://extensions/`
3. Bật **Developer mode** (toggle ở góc trên bên phải)
4. Click nút **Load unpacked**
5. Chọn thư mục: `d:\Desktop\Outsourcing-project\agoda-extension\`
6. Extension sẽ xuất hiện trong danh sách

## Bước 4: Test Extension

### 4.1. Đăng nhập Agoda

1. Truy cập: https://www.agoda.com/
2. Đăng nhập vào tài khoản Agoda của bạn
3. Extension sẽ tự động lấy cookies

### 4.2. Test lấy dữ liệu

1. Truy cập trang khách sạn mẫu:
   ```
   https://www.agoda.com/vi-vn/infinity-pool-signature-freegym-pool-netflix-2/hotel/ho-chi-minh-city-vn.html?hotel_id=10308484&checkIn=2025-11-10&adults=2&rooms=1
   ```

2. Click vào icon extension (góc trên bên phải Chrome)

3. Popup sẽ hiển thị:
   - ✅ Status đăng nhập
   - Hotel ID: 10308484
   - Check In/Out dates

4. Click nút **"💰 Lấy Giá Phòng"**
   - Đợi 2-3 giây
   - Sẽ hiển thị danh sách phòng và giá

5. Click nút **"📊 Export to Google Sheets"**
   - Đợi 3-5 giây
   - Nếu thành công, sẽ hiển thị:
     ```
     ✅ Export thành công!
     Sheet: Data_1-11-2025_19-30
     Số phòng: 12
     [Mở Google Sheets]
     ```

6. Click vào link "Mở Google Sheets" để xem kết quả

## ⚠️ Troubleshooting

### Lỗi: "Chưa cấu hình Google API Key"

**Nguyên nhân**: File `config.js` chưa được cập nhật

**Giải pháp**:
1. Mở file `config.js`
2. Kiểm tra dòng `GOOGLE_API_KEY`
3. Đảm bảo đã thay `YOUR_API_KEY_HERE` bằng API Key thực
4. Save file và reload extension

### Lỗi: "Failed to create sheet"

**Nguyên nhân 1**: Sheet chưa được chia sẻ public

**Giải pháp**:
1. Mở Google Sheet
2. Click **Share** → **Anyone with the link** → **Editor**

**Nguyên nhân 2**: API Key không có quyền

**Giải pháp**:
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project
3. **APIs & Services** → **Credentials**
4. Click vào API Key
5. Đảm bảo **Google Sheets API** được enable
6. Hoặc tạo API Key mới

### Lỗi: "Chưa có cookies"

**Nguyên nhân**: Chưa đăng nhập Agoda hoặc cookies đã hết hạn

**Giải pháp**:
1. Đăng nhập vào Agoda.com
2. Click icon extension
3. Click nút **"🔄 Refresh Cookies"**
4. Thử lại

### Không hiển thị Hotel ID

**Nguyên nhân**: Không đang ở trang chi tiết khách sạn

**Giải pháp**:
1. Đảm bảo URL chứa `/hotel/` hoặc parameter `hotel_id=`
2. Reload trang
3. Mở lại popup extension

### Extension không hoạt động sau khi update code

**Giải pháp**:
1. Vào `chrome://extensions/`
2. Click icon 🔄 (Reload) trên extension
3. Reload trang Agoda
4. Thử lại

## 📊 Kiểm tra kết quả trong Google Sheets

Sau khi export thành công:

1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw/edit

2. Tìm sheet mới với tên: `Data_DD-MM-YYYY_HH-MM`

3. Kiểm tra dữ liệu:
   - Row 1: Header (Timestamp, Hotel ID, Room Name, Price, etc.)
   - Row 2+: Dữ liệu các phòng
   - Mỗi phòng 1 row

4. Các cột quan trọng:
   - **Timestamp**: Thời gian lấy data
   - **Hotel ID**: ID khách sạn
   - **Room Name**: Tên loại phòng
   - **Price (VND)**: Giá hiện tại
   - **Original Price (VND)**: Giá gốc
   - **Discount (%)**: % giảm giá

## 🔐 Bảo mật

### Khuyến nghị:

1. **Không commit API Key lên Git**
   - Thêm `config.js` vào `.gitignore`

2. **Giới hạn API Key**
   - Restrict key chỉ cho Google Sheets API
   - Set HTTP referrer restrictions (nếu cần)

3. **Sử dụng OAuth2** (nâng cao)
   - Bảo mật hơn API Key
   - Cần implement flow phức tạp hơn

4. **Monitor usage**
   - Kiểm tra [Google Cloud Console](https://console.cloud.google.com/) để theo dõi usage
   - Google Sheets API có quota: 100 requests/100 seconds/user

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra lại các bước setup
2. Xem Console log:
   - Right-click extension icon → **Inspect**
   - Tab **Console** để xem errors
3. Kiểm tra Network tab để debug API calls
