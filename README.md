# 🏨 Agoda Price Extractor

Extension Chrome để tự động lấy dữ liệu giá phòng từ Agoda và export lên Google Sheets.

## ✨ Tính năng

- ✅ Tự động lấy cookies khi truy cập Agoda
- 💰 Lấy giá phòng từ API Agoda
- 📊 Export dữ liệu lên Google Sheets (tự động tạo sheet mới theo ngày)
- 📋 Copy dữ liệu JSON
- 🔄 Refresh cookies thủ công

## 📦 Cài đặt

### 1. Load Extension vào Chrome

1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `agoda-extension`

### 2. Cấu hình Google Sheets API

#### Bước 1: Tạo Google Cloud Project và API Key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Enable **Google Sheets API**:
   - Vào **APIs & Services** → **Library**
   - Tìm "Google Sheets API"
   - Click **Enable**

4. Tạo API Key:
   - Vào **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy API Key vừa tạo

#### Bước 2: Cấu hình Google Sheets

1. Mở Google Sheets của bạn: [Link Sheet](https://docs.google.com/spreadsheets/d/1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw/edit)
2. Chia sẻ sheet với quyền **Editor** cho tất cả mọi người có link (hoặc public)
   - Click **Share** → **Anyone with the link** → **Editor**

#### Bước 3: Cập nhật config.js

Mở file `config.js` và thay thế `YOUR_API_KEY_HERE` bằng API Key bạn vừa tạo:

```javascript
const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSy...', // ← Thay thế bằng API Key của bạn
  SPREADSHEET_ID: '1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw',
  SHEETS_API_URL: 'https://sheets.googleapis.com/v4/spreadsheets'
};
```

## 🚀 Sử dụng

### Lấy dữ liệu từ Agoda

1. Đăng nhập vào [Agoda.com](https://www.agoda.com/)
2. Truy cập trang chi tiết khách sạn (ví dụ hotel ID: 10308484)
3. Click vào icon extension
4. Click nút **"🔄 Refresh Cookies"** (lần đầu tiên)
5. Click nút **"💰 Lấy Giá Phòng"**
6. Đợi extension lấy dữ liệu

### Export lên Google Sheets

1. Sau khi lấy dữ liệu thành công
2. Click nút **"📊 Export to Google Sheets"**
3. Đợi vài giây
4. Sheet mới sẽ được tạo với tên `Data_DD-MM-YYYY_HH-MM`
5. Click vào link "Mở Google Sheets" để xem kết quả

## 📊 Cấu trúc dữ liệu trong Google Sheets

Mỗi lần export sẽ tạo 1 sheet mới với các cột:

| Cột | Mô tả |
|-----|-------|
| Timestamp | Thời gian lấy dữ liệu |
| Hotel ID | ID khách sạn |
| Hotel Name | Tên khách sạn |
| Check In | Ngày nhận phòng |
| Check Out | Ngày trả phòng |
| Room Name | Tên loại phòng |
| Room ID | ID phòng |
| Price (VND) | Giá hiện tại |
| Original Price (VND) | Giá gốc |
| Discount (%) | % giảm giá |
| Currency | Đơn vị tiền tệ |
| Adults | Số người lớn |
| Children | Số trẻ em |
| Rooms | Số phòng |
| Supplier | Nhà cung cấp |
| Available Rooms | Số phòng còn trống |
| Max Occupancy | Số người tối đa |

## 🔧 API URL Mẫu

```
https://www.agoda.com/api/cronos/property/BelowFoldParams/GetSecondaryData?countryId=38&finalPriceView=1&isShowMobileAppPrice=false&cid=1922896&numberOfBedrooms=&familyMode=false&adults=2&children=0&rooms=1&maxRooms=0&checkIn=2025-11-10&isCalendarCallout=false&childAges=&numberOfGuest=0&missingChildAges=false&travellerType=1&showReviewSubmissionEntry=false&currencyCode=VND&isFreeOccSearch=false&tag=7adbeb35-4108-414c-9559-32893b4cdfe5&tspTypes=-1&los=1&searchrequestid=e2c75e53-4b6c-47dc-8873-695bb5be1f75&ds=kjlZTsxoLXJTeA3k&hotel_id=10308484&all=false&isHostPropertiesEnabled=false&price_view=1&sessionid=ztmrwomkqhrqzxw5gqep2uxk&pagetypeid=7
```

## 📁 Cấu trúc Project

```
agoda-extension/
├── manifest.json          # Extension config
├── background.js          # Service worker (API calls, cookies)
├── content.js             # Content script (extract hotel info)
├── popup.html             # UI popup
├── popup.js               # Popup logic
├── config.js              # Configuration (API keys)
├── googleSheets.js        # Google Sheets API helper
└── README.md              # Documentation
```

## ⚠️ Lưu ý

1. **API Key Security**: Không share API Key công khai. Nếu cần bảo mật cao hơn, sử dụng OAuth2 thay vì API Key.
2. **Rate Limiting**: Google Sheets API có giới hạn requests. Không nên export quá nhiều lần trong thời gian ngắn.
3. **Permissions**: Sheet phải được chia sẻ public hoặc với API Key account.
4. **Cookies**: Extension cần cookies hợp lệ từ Agoda. Nếu hết hạn, cần refresh lại.

## 🐛 Troubleshooting

### Lỗi: "Chưa cấu hình Google API Key"
- Kiểm tra file `config.js`
- Đảm bảo đã thay thế `YOUR_API_KEY_HERE` bằng API Key thực

### Lỗi: "Failed to create sheet"
- Kiểm tra Google Sheet đã được chia sẻ public chưa
- Kiểm tra API Key có quyền truy cập Sheet không
- Thử tạo API Key mới

### Lỗi: "Chưa có cookies"
- Click nút "🔄 Refresh Cookies"
- Đảm bảo đã đăng nhập Agoda
- Reload trang Agoda và thử lại

### Không lấy được hotel ID
- Đảm bảo đang ở trang chi tiết khách sạn
- URL phải chứa `/hotel/` hoặc có parameter `hotel_id`

## 📝 License

MIT License - Free to use and modify
