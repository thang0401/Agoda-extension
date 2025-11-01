let currentHotelInfo = null;
let latestResponseData = null;

// Kiểm tra trạng thái khi mở popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  await loadHotelInfo();
});

// Kiểm tra login status và cookies
async function checkStatus() {
  const statusDiv = document.getElementById('loginStatus');
  
  // Kiểm tra chrome API có sẵn không
  if (typeof chrome === 'undefined' || !chrome.storage) {
    statusDiv.className = 'status error';
    statusDiv.innerHTML = '⚠️ Extension chưa được load đúng cách<br><small>Vui lòng load extension qua chrome://extensions/</small>';
    return;
  }
  
  try {
    // Lấy cookies từ storage
    const result = await chrome.storage.local.get(['agodaCookies', 'isLoggedIn', 'lastUpdate', 'cookieCount']);
    
    console.log('📊 Storage data:', result);
    console.log('📊 agodaCookies length:', result.agodaCookies?.length || 0);
    console.log('📊 isLoggedIn:', result.isLoggedIn);
    console.log('📊 cookieCount:', result.cookieCount);
    
    // Check nếu có cookies (dù isLoggedIn = false)
    const hasCookies = result.agodaCookies && result.agodaCookies.length > 0;
    const cookieCount = result.cookieCount || 0;
    
    if (hasCookies || result.isLoggedIn) {
      statusDiv.className = 'status success';
      statusDiv.innerHTML = `
        ✅ Đã có cookies<br>
        <small>Cookies: ${cookieCount} cookies<br>
        Cập nhật: ${result.lastUpdate ? new Date(result.lastUpdate).toLocaleString('vi-VN') : 'Chưa cập nhật'}</small>
      `;
      document.getElementById('extractPrice').disabled = false;
    } else {
      statusDiv.className = 'status error';
      statusDiv.innerHTML = `
        ❌ Chưa có cookies<br>
        <small>Cookies hiện tại: ${cookieCount}<br>
        Storage keys: ${Object.keys(result).join(', ')}<br>
        Vui lòng đăng nhập Agoda và refresh cookies</small>
      `;
    }
  } catch (error) {
    statusDiv.className = 'status error';
    statusDiv.textContent = '❌ Lỗi: ' + error.message;
  }
}

// Load thông tin hotel từ current tab
async function loadHotelInfo() {
  // Kiểm tra chrome API
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('agoda.com')) {
      return;
    }
    
    // Gửi message đến content script
    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'extractHotelInfo' 
    });
    
    if (response && response.hotelId) {
      currentHotelInfo = response;
      displayHotelInfo(response);
    }
  } catch (error) {
    console.error('Error loading hotel info:', error);
  }
}

// Hiển thị thông tin hotel
function displayHotelInfo(info) {
  document.getElementById('hotelInfo').style.display = 'block';
  document.getElementById('hotelId').textContent = info.hotelId || 'N/A';
  document.getElementById('checkIn').textContent = info.checkIn || 'N/A';
  document.getElementById('checkOut').textContent = info.checkOut || 'N/A';
  document.getElementById('rooms').textContent = info.rooms || 'N/A';
}

// Refresh cookies
document.getElementById('refreshCookies').addEventListener('click', async () => {
  const button = document.getElementById('refreshCookies');
  button.disabled = true;
  button.textContent = '⏳ Đang refresh...';
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    alert('Extension chưa được load đúng cách. Vui lòng load qua chrome://extensions/');
    button.textContent = '🔄 Refresh Cookies';
    button.disabled = false;
    return;
  }
  
  try {
    // Trigger background script để lấy cookies mới
    const response = await chrome.runtime.sendMessage({ action: 'refreshCookies' });
    console.log('Refresh response:', response);
    
    // Wait để storage được update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Kiểm tra lại status
    await checkStatus();
    
    // Lấy storage để verify
    const storageData = await chrome.storage.local.get(['cookieCount', 'isLoggedIn']);
    console.log('After refresh - Storage:', storageData);
    
    button.textContent = '✅ Đã refresh!';
    setTimeout(() => {
      button.textContent = '🔄 Refresh Cookies';
      button.disabled = false;
    }, 2000);
  } catch (error) {
    alert('Lỗi: ' + error.message);
    button.textContent = '🔄 Refresh Cookies';
    button.disabled = false;
  }
});

// Lấy giá phòng
document.getElementById('extractPrice').addEventListener('click', async () => {
  const button = document.getElementById('extractPrice');
  const resultDiv = document.getElementById('result');
  
  button.disabled = true;
  button.textContent = '⏳ Đang lấy dữ liệu...';
  resultDiv.textContent = 'Đang xử lý...';
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    resultDiv.textContent = '❌ Extension chưa được load đúng cách';
    button.textContent = '💰 Lấy Giá Phòng';
    button.disabled = false;
    return;
  }
  
  try {
    if (!currentHotelInfo || !currentHotelInfo.hotelId) {
      throw new Error('Không tìm thấy thông tin khách sạn. Vui lòng vào trang chi tiết khách sạn.');
    }
    
    // Build API params
    const params = {
      hotel_id: currentHotelInfo.hotelId,
      checkIn: currentHotelInfo.checkIn || '2025-11-10',
      adults: currentHotelInfo.adults || '2',
      children: currentHotelInfo.children || '0',
      rooms: currentHotelInfo.rooms || '1',
      countryId: '38',
      currencyCode: 'VND',
      finalPriceView: '1',
      los: '1',
      // Thêm referer từ current URL của hotel page
      referer: currentHotelInfo.currentUrl || 'https://www.agoda.com/'
    };
    
    console.log('📤 Sending params:', params);
    
    // Gọi background script để fetch
    const response = await chrome.runtime.sendMessage({
      action: 'fetchPrice',
      url: 'https://www.agoda.com/api/cronos/property/BelowFoldParams/GetSecondaryData',
      params: params
    });
    
    if (response.success) {
      // Lấy thông tin giá
      const data = response.data;
      const roomGrid = data.roomGridData;
      
      let priceInfo = 'GIÁ PHÒNG:\n\n';
      
      if (roomGrid && roomGrid.masterRooms) {
        roomGrid.masterRooms.forEach((room, index) => {
          // Lấy giá từ room rate đầu tiên nếu có
          const rate = room.roomRates && room.roomRates[0];
          const displayPrice = rate?.displayPrice || room.cheapestPrice || 0;
          const crossedPrice = rate?.crossedOutPrice || room.beforeDiscountPrice || displayPrice;
          
          // Tính discount percentage
          let discount = 0;
          if (crossedPrice > displayPrice && crossedPrice > 0) {
            discount = Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100);
          }
          
          priceInfo += `${index + 1}. ${room.name}\n`;
          priceInfo += `   Giá: ${Math.round(displayPrice).toLocaleString('vi-VN')} ₫\n`;
          priceInfo += `   Giá gốc: ${Math.round(crossedPrice).toLocaleString('vi-VN')} ₫\n`;
          priceInfo += `   Giảm giá: ${discount}%\n\n`;
        });
      }
      
      resultDiv.textContent = priceInfo;
      document.getElementById('copyResult').style.display = 'block';
      
      // Lưu kết quả để copy và export
      resultDiv.dataset.fullData = JSON.stringify(data, null, 2);
      latestResponseData = data;
      
      // Hiển thị nút Export to Sheets
      document.getElementById('exportToSheets').style.display = 'block';
      
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    resultDiv.textContent = 'Lỗi: ' + error.message;
  } finally {
    button.textContent = 'Lấy Giá Phòng';
    button.disabled = false;
  }
});

// Export to Google Sheets
document.getElementById('exportToSheets').addEventListener('click', async () => {
  const button = document.getElementById('exportToSheets');
  const statusDiv = document.getElementById('exportStatus');
  
  if (!latestResponseData) {
    alert('Không có dữ liệu để export. Vui lòng lấy giá phòng trước.');
    return;
  }
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    alert('Extension chưa được load đúng cách');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Đang export...';
  statusDiv.style.display = 'block';
  statusDiv.className = 'status';
  statusDiv.textContent = 'Đang xuất dữ liệu lên Google Sheets...';
  
  try {
    // Gọi background script để export
    const response = await chrome.runtime.sendMessage({
      action: 'exportToSheets',
      data: latestResponseData
    });
    
    if (response.success) {
      statusDiv.className = 'status success';
      statusDiv.innerHTML = `
        Export thành công!<br>
        <small>Sheet: ${response.sheetName}<br>
        Số phòng: ${response.rowCount}<br>
        <a href="${response.url}" target="_blank">Mở Google Sheets</a></small>
      `;
      
      button.textContent = 'Đã export!';
      setTimeout(() => {
        button.textContent = 'Export to Google Sheets';
        button.disabled = false;
      }, 3000);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    statusDiv.className = 'status error';
    statusDiv.textContent = 'Lỗi export: ' + error.message;
    button.textContent = 'Export to Google Sheets';
    button.disabled = false;
  }
});

// Copy kết quả
document.getElementById('copyResult').addEventListener('click', () => {
  const resultDiv = document.getElementById('result');
  const fullData = resultDiv.dataset.fullData || resultDiv.textContent;
  
  navigator.clipboard.writeText(fullData).then(() => {
    const button = document.getElementById('copyResult');
    button.textContent = '✅ Đã copy!';
    setTimeout(() => {
      button.textContent = '📋 Copy Kết Quả';
    }, 2000);
  });
});