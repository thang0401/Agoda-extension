# 🐛 Debug Guide - Kiểm tra Cookies

## Vấn đề: "Chưa đăng nhập hoặc chưa có cookies"

### Cách 1: Kiểm tra Console Logs

#### Bước 1: Mở Console của Background Script

1. Vào `chrome://extensions/`
2. Tìm extension **Agoda Price Extractor**
3. Click vào link **service worker** (hoặc **Inspect views: background page**)
4. Tab **Console** sẽ hiện ra

#### Bước 2: Kiểm tra Logs

Sau khi đăng nhập Agoda và vào trang agoda.com, bạn sẽ thấy logs:

```
🔍 Total cookies found: 15
🔍 Cookie names: ["ag_geo", "agoda.version.03", "sessionid", ...]
✅ Cookies đã được lưu: {count: 15, isLoggedIn: true, hasLoginCookie: true}
```

**Nếu thấy:**
- ✅ `count: 15` hoặc nhiều hơn → Cookies đã được lấy
- ✅ `isLoggedIn: true` → Đã nhận dạng login
- ❌ `count: 0` hoặc rất ít → Có vấn đề với permissions

#### Bước 3: Kiểm tra Popup Console

1. Right-click vào icon extension
2. Chọn **Inspect**
3. Tab **Console**
4. Mở popup (click icon extension)
5. Xem log:

```
📊 Storage data: {agodaCookies: "...", isLoggedIn: true, cookieCount: 15}
```

### Cách 2: Kiểm tra Chrome Storage

#### Sử dụng Extension Inspector:

1. Right-click icon extension → **Inspect**
2. Tab **Console**
3. Gõ lệnh:

```javascript
chrome.storage.local.get(null, (data) => console.log(data));
```

4. Xem kết quả:
   - `agodaCookies`: Chuỗi cookies
   - `isLoggedIn`: true/false
   - `cookieCount`: Số lượng cookies
   - `lastUpdate`: Thời gian update

### Cách 3: Test Thủ Công

#### Option A: Reload Extension

1. Vào `chrome://extensions/`
2. Click icon 🔄 **Reload** trên extension
3. Vào lại trang Agoda
4. Click popup extension

#### Option B: Clear Storage và Refresh

1. Right-click icon extension → **Inspect**
2. Tab **Console**
3. Gõ:

```javascript
chrome.storage.local.clear(() => console.log('Storage cleared'));
```

4. Reload extension
5. Đăng nhập Agoda lại
6. Click **🔄 Refresh Cookies**

### Cách 4: Kiểm tra Permissions

#### Xem Permissions của Extension:

1. Vào `chrome://extensions/`
2. Click **Details** của extension
3. Scroll xuống **Permissions**
4. Đảm bảo có:
   - ✅ Read and change your data on www.agoda.com
   - ✅ Read and change your cookies

#### Nếu thiếu permissions:

1. Xóa extension
2. Load lại từ thư mục
3. Chrome sẽ hỏi permissions lại

### Cách 5: Test với DevTools Network

#### Kiểm tra Cookies thực tế:

1. Vào https://www.agoda.com/
2. Đăng nhập
3. F12 → Tab **Application** → **Cookies** → `https://www.agoda.com`
4. Xem danh sách cookies:
   - `agoda.auth` hoặc tương tự
   - `sessionid`
   - `member.token`
   - ... và nhiều cookies khác

**Copy danh sách cookie names** và gửi cho dev để check.

## 🔧 Solutions (Giải pháp)

### Giải pháp 1: Force Refresh

```javascript
// Mở popup inspector console, gõ:
chrome.runtime.sendMessage({action: 'refreshCookies'}, (response) => {
  console.log('Refresh result:', response);
});
```

### Giải pháp 2: Manually Save Cookies

Nếu tự động không hoạt động, thêm code test:

1. Vào background script console
2. Gõ:

```javascript
chrome.cookies.getAll({domain: '.agoda.com'}, (cookies) => {
  console.log('All cookies:', cookies);
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  chrome.storage.local.set({
    agodaCookies: cookieString,
    isLoggedIn: true,
    cookieCount: cookies.length,
    lastUpdate: new Date().toISOString()
  }, () => {
    console.log('✅ Manually saved');
  });
});
```

### Giải pháp 3: Update Manifest Permissions

Nếu vẫn không được, thêm vào `manifest.json`:

```json
{
  "permissions": [
    "cookies",
    "storage", 
    "tabs",
    "activeTab",
    "webRequest"  // ← Thêm dòng này
  ],
  "host_permissions": [
    "https://www.agoda.com/*",
    "https://*.agoda.com/*",
    "http://www.agoda.com/*"  // ← Thêm http nếu cần
  ]
}
```

## 📊 Expected Values (Giá trị mong đợi)

### Sau khi login thành công:

```javascript
{
  agodaCookies: "ag_geo=VN; sessionid=abc123xyz...; [~2000 characters]",
  isLoggedIn: true,
  cookieCount: 12-20,  // Thường 10-20 cookies
  lastUpdate: "2025-11-01T13:30:00.000Z"
}
```

### Nếu chưa login:

```javascript
{
  agodaCookies: "ag_geo=VN; agoda.version=...",
  isLoggedIn: false,  // hoặc undefined
  cookieCount: 2-5,   // Rất ít cookies
  lastUpdate: "2025-11-01T13:30:00.000Z"
}
```

## ⚠️ Common Issues

### Issue 1: Extension không tự động lấy cookies

**Nguyên nhân:**
- Background script không chạy
- Tab listener không trigger

**Giải pháp:**
- Reload extension
- Check background script console có error không

### Issue 2: Cookies bị xóa sau khi đóng browser

**Nguyên nhân:**
- Chrome sync settings
- Incognito mode

**Giải pháp:**
- Không dùng incognito
- Check Chrome settings → Privacy → Cookies

### Issue 3: "isLoggedIn: false" dù đã có nhiều cookies

**Nguyên nhân:**
- Logic check cookie name không match

**Giải pháp:**
- Đã fix trong version mới (check cookies.length > 5)
- Nếu vẫn lỗi, report cookie names

## 📞 Report Issue

Nếu vẫn không được, hãy gửi thông tin sau:

1. **Background script console logs:**
   - Total cookies found: ?
   - Cookie names: [...]

2. **Storage data:**
   - cookieCount: ?
   - isLoggedIn: ?

3. **Chrome version:**
   - chrome://version/

4. **Extension reload:**
   - Đã reload extension chưa?
   - Đã xóa và load lại chưa?
