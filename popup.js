let currentHotelInfo = null;

// Kiểm tra trạng thái khi mở popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  await loadHotelInfo();
});

// Kiểm tra login status và cookies
async function checkStatus() {
  const statusDiv = document.getElementById('loginStatus');
  
  try {
    // Lấy cookies từ storage
    const result = await chrome.storage.local.get(['agodaCookies', 'isLoggedIn', 'lastUpdate']);
    
    if (result.isLoggedIn && result.agodaCookies) {
      statusDiv.className = 'status success';
      statusDiv.innerHTML = `
        ✅ Đã đăng nhập<br>
        <small>Cookies cập nhật: ${new Date(result.lastUpdate).toLocaleString('vi-VN')}</small>
      `;
      document.getElementById('extractPrice').disabled = false;
    } else {
      statusDiv.className = 'status error';
      statusDiv.innerHTML = '❌ Chưa đăng nhập hoặc chưa có cookies<br><small>Vui lòng đăng nhập Agoda và refresh cookies</small>';
    }
  } catch (error) {
    statusDiv.className = 'status error';
    statusDiv.textContent = '❌ Lỗi: ' + error.message;
  }
}

// Load thông tin hotel từ current tab
async function loadHotelInfo() {
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
  
  try {
    // Trigger background script để lấy cookies mới
    await chrome.runtime.sendMessage({ action: 'refreshCookies' });
    
    // Wait một chút
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Kiểm tra lại status
    await checkStatus();
    
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
      los: '1'
    };
    
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
          priceInfo += `${index + 1}. ${room.name}\n`;
          priceInfo += `   Giá: ${room.cheapestPrice.toLocaleString('vi-VN')} ₫\n`;
          priceInfo += `   Giá gốc: ${room.beforeDiscountPrice.toLocaleString('vi-VN')} ₫\n`;
          priceInfo += `   Giảm giá: ${room.discountPercentage}%\n\n`;
        });
      }
      
      resultDiv.textContent = priceInfo;
      document.getElementById('copyResult').style.display = 'block';
      
      // Lưu kết quả để copy
      resultDiv.dataset.fullData = JSON.stringify(data, null, 2);
      
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    resultDiv.textContent = '❌ Lỗi: ' + error.message;
  } finally {
    button.textContent = '💰 Lấy Giá Phòng';
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