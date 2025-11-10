let currentHotelInfo = null;
let latestResponseData = null;

// Kiểm tra trạng thái khi mở popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  await loadHotelInfo();
  initializeDateInputs();
});

// Initialize date inputs với default values
function initializeDateInputs() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const dateRangeInfo = document.getElementById('dateRangeInfo');
  
  // Set default: từ hôm nay đến 7 ngày sau
  const today = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);
  
  startDateInput.valueAsDate = today;
  endDateInput.valueAsDate = sevenDaysLater;
  
  // Update info khi thay đổi date
  function updateDateRangeInfo() {
    const start = new Date(startDateInput.value);
    const end = new Date(endDateInput.value);
    
    if (startDateInput.value && endDateInput.value) {
      if (end < start) {
        dateRangeInfo.innerHTML = '⚠️ Ngày kết thúc phải sau ngày bắt đầu!';
        dateRangeInfo.style.color = '#d32f2f';
        return;
      }
      
      const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const hotelCount = window.HOTEL_LIST?.filter(h => h.hotelId).length || 5;
      const totalRequests = dayCount * hotelCount;
      
      dateRangeInfo.innerHTML = `
        📊 Sẽ crawl <strong>${dayCount} ngày</strong> × <strong>${hotelCount} hotels</strong> = <strong>${totalRequests} requests</strong><br>
        ⏱️ Ước tính: ${Math.ceil(totalRequests * 3 / 60)} phút (với delay 3s/request)
      `;
      dateRangeInfo.style.color = '#555';
    }
  }
  
  startDateInput.addEventListener('change', updateDateRangeInfo);
  endDateInput.addEventListener('change', updateDateRangeInfo);
  
  // Update info ngay lập tức
  updateDateRangeInfo();
}

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
      document.getElementById('batchFetchAll').disabled = false;
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
        ✅ Export thành công!<br>
        <small>Sheet: <strong>${response.sheetName}</strong><br>
        Đã thêm: <strong>${response.rowCount}</strong> rows<br>
        Tổng dữ liệu: <strong>${response.totalRows}</strong> rows<br>
        <a href="${response.url}" target="_blank" style="color: #0057B8; font-weight: bold;">📊 Mở Google Sheets</a></small>
      `;
      
      button.textContent = '✅ Đã export!';
      setTimeout(() => {
        button.textContent = '📊 Export to Google Sheets';
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

// Batch fetch tất cả hotels
document.getElementById('batchFetchAll').addEventListener('click', async () => {
  const button = document.getElementById('batchFetchAll');
  const resultDiv = document.getElementById('result');
  
  // Lấy date range
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (!startDateInput.value || !endDateInput.value) {
    alert('⚠️ Vui lòng chọn ngày bắt đầu và ngày kết thúc!');
    return;
  }
  
  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);
  
  if (endDate < startDate) {
    alert('⚠️ Ngày kết thúc phải sau ngày bắt đầu!');
    return;
  }
  
  // Generate array of dates
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const hotelCount = window.HOTEL_LIST?.filter(h => h.hotelId).length || 5;
  const totalRequests = dates.length * hotelCount;
  const estimatedMinutes = Math.ceil(totalRequests * 3 / 60);
  
  const confirmMsg = `📊 Sẽ crawl:\n` +
    `• ${dates.length} ngày (${startDateInput.value} đến ${endDateInput.value})\n` +
    `• ${hotelCount} hotels\n` +
    `• Tổng: ${totalRequests} requests\n` +
    `• Thời gian ước tính: ${estimatedMinutes} phút\n\n` +
    `Bạn có muốn tiếp tục?`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  button.disabled = true;
  button.textContent = '⏳ Đang lấy dữ liệu...';
  resultDiv.textContent = `Đang xử lý batch fetch...\n`;
  resultDiv.textContent += `📅 ${dates.length} ngày × 🏨 ${hotelCount} hotels = 📊 ${totalRequests} requests\n\n`;
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    resultDiv.textContent = '❌ Extension chưa được load đúng cách';
    button.textContent = '🚀 Lấy Tất Cả Hotels';
    button.disabled = false;
    return;
  }
  
  try {
    // Lấy base params - THÊM ĐẦY ĐỦ PARAMS
    const baseParams = {
      adults: currentHotelInfo?.adults || '2',
      children: currentHotelInfo?.children || '0',
      rooms: currentHotelInfo?.rooms || '1',
      countryId: '38',
      currencyCode: 'VND',
      finalPriceView: '1',
      los: '1',
      travellerType: '1',
      isShowMobileAppPrice: 'false',
      isFreeOccSearch: 'false',
      referer: 'https://www.agoda.com/'
    };
    
    // Format dates array to YYYY-MM-DD strings
    const dateStrings = dates.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    console.log('📤 Starting batch fetch with dates:', dateStrings);
    resultDiv.textContent += 'Loading...\n';
    
    // Gọi background script để batch fetch với date range
    const response = await chrome.runtime.sendMessage({
      action: 'batchFetchAllHotelsWithDates',
      params: baseParams,
      dates: dateStrings
    });
    
    if (response.success) {
      // Hiển thị kết quả - CHỈ SUMMARY
      let summaryText = `\n🎉 HOÀN THÀNH!\n\n`;
      summaryText += `Tổng số hotels: ${response.summary.total}\n`;
      summaryText += `Thành công: ${response.summary.success}\n`;
      summaryText += `Thất bại: ${response.summary.failed}`;
      
      resultDiv.textContent = summaryText;
      
      // Lưu kết quả để export
      latestResponseData = {
        batchResults: response.results,
        summary: response.summary,
        timestamp: new Date().toISOString()
      };
      
      document.getElementById('exportToSheets').style.display = 'block';
      
      button.textContent = '✅ Hoàn thành!';
      setTimeout(() => {
        button.textContent = '🚀 Lấy Tất Cả Hotels';
        button.disabled = false;
      }, 3000);
      
    } else {
      throw new Error(response.error || 'Unknown error');
    }
    
  } catch (error) {
    resultDiv.textContent = '❌ Lỗi: ' + error.message;
    button.textContent = '🚀 Lấy Tất Cả Hotels';
    button.disabled = false;
  }
});