let currentHotelInfo = null;
let latestResponseData = null;
let progressInterval = null; // Interval để update progress

// Kiểm tra trạng thái khi mở popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  await loadHotelInfo();
  initializeDateInputs();
  await checkBatchProgress(); // Check xem có process đang chạy không
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

// Check xem có batch process đang chạy không
async function checkBatchProgress() {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getBatchProgress' });
    
    if (response.progress && response.progress.isRunning) {
      // Có process đang chạy, hiển thị progress
      console.log('🔄 Phát hiện batch đang chạy:', response.progress);
      showBatchProgress(response.progress);
      startProgressTracking();
    } else if (response.summary && response.summary.completed) {
      // Process đã hoàn thành, hiển thị summary
      console.log('✅ Phát hiện batch đã hoàn thành:', response.summary);
      showBatchSummary(response.summary);
    }
  } catch (error) {
    console.error('Error checking batch progress:', error);
  }
}

// Hiển thị progress đang chạy
function showBatchProgress(progress) {
  const resultDiv = document.getElementById('result');
  const button = document.getElementById('batchFetchAll');
  const checkButton = document.getElementById('checkResults');
  
  button.disabled = true;
  button.textContent = '⏳ Đang crawl...';
  
  const percent = Math.round((progress.current / progress.total) * 100);
  resultDiv.textContent = `🔄 ĐANG CRAWL & EXPORT...\n\n`;
  resultDiv.textContent += `Progress: ${progress.current}/${progress.total} (${percent}%)\n`;
  resultDiv.textContent += `Status: ${progress.status}\n`;
  resultDiv.textContent += `Đã export: ${progress.totalExported || 0} rows\n\n`;
  resultDiv.textContent += `💡 Bạn có thể đóng popup này, tiến trình sẽ tiếp tục chạy ngầm!`;
  
  // Hiện nút Check Results khi đã 100%
  if (percent === 100) {
    checkButton.style.display = 'block';
  }
}

// Start tracking progress với interval
function startProgressTracking() {
  // Clear interval cũ nếu có
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  
  // Update progress mỗi 2 giây
  progressInterval = setInterval(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBatchProgress' });
      
      console.log('📊 Progress check:', response);
      
      // Check xem đã hoàn thành chưa
      const isComplete = !response.progress?.isRunning || 
                        (response.progress?.current >= response.progress?.total);
      
      if (response.progress && !isComplete) {
        // Vẫn đang chạy
        showBatchProgress(response.progress);
      } else if (isComplete || response.summary?.completed) {
        // Đã hoàn thành
        console.log('✅ Process completed, clearing interval');
        clearInterval(progressInterval);
        progressInterval = null;
        
        // Hiển thị summary
        if (response.summary && response.summary.completed) {
          showBatchSummary(response.summary);
        } else {
          // Fallback: tự tạo summary từ progress
          const button = document.getElementById('batchFetchAll');
          const resultDiv = document.getElementById('result');
          
          resultDiv.textContent = `\n🎉 HOÀN THÀNH!\n\n`;
          resultDiv.textContent += `Tổng số requests: ${response.progress.total}\n`;
          resultDiv.textContent += `Đã export: ${response.progress.totalExported || 0} rows\n\n`;
          resultDiv.textContent += `⚠️ Đang load summary...`;
          
          button.textContent = '✅ Hoàn thành!';
          button.disabled = false;
          
          // Retry check summary sau 2s
          setTimeout(async () => {
            const retryResponse = await chrome.runtime.sendMessage({ action: 'getBatchProgress' });
            if (retryResponse.summary?.completed) {
              showBatchSummary(retryResponse.summary);
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error tracking progress:', error);
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }, 2000);
}

// Hiển thị summary batch (không cần export button vì đã export realtime)
function showBatchSummary(batchSummary) {
  const resultDiv = document.getElementById('result');
  const button = document.getElementById('batchFetchAll');
  const checkButton = document.getElementById('checkResults');
  
  let summaryText = `\n🎉 HOÀN THÀNH!\n\n`;
  summaryText += `Tổng số requests: ${batchSummary.total}\n`;
  summaryText += `Đã export: ${batchSummary.exported} rows\n`;
  
  if (batchSummary.soldOut > 0) {
    summaryText += `🏨 Hết phòng: ${batchSummary.soldOut} hotels\n`;
  }
  if (batchSummary.realErrors > 0) {
    summaryText += `❌ Lỗi thật: ${batchSummary.realErrors}\n`;
  }
  
  summaryText += `\n📊 Dữ liệu đã được export trực tiếp lên Google Sheets!\n`;
  summaryText += `🕒 Hoàn thành lúc: ${new Date(batchSummary.timestamp).toLocaleString('vi-VN')}`;
  
  if (batchSummary.errors && batchSummary.errors.length > 0) {
    const realErrors = batchSummary.errors.filter(e => !e.error.includes('No room data'));
    if (realErrors.length > 0) {
      summaryText += `\n\n❌ Lỗi kỹ thuật:\n`;
      realErrors.slice(0, 3).forEach(error => {
        summaryText += `• ${error.hotel} (${error.date}): ${error.error}\n`;
      });
    }
  }
  
  resultDiv.textContent = summaryText;
  
  // Không cần export button vì đã export realtime
  checkButton.style.display = 'none';
  
  button.textContent = '✅ Hoàn thành!';
  setTimeout(() => {
    button.textContent = '🚀 Lấy Tất Cả Hotels';
    button.disabled = false;
  }, 3000);
}

// Hiển thị kết quả batch (legacy - giữ lại cho tương thích)
function showBatchResults(batchResults) {
  const resultDiv = document.getElementById('result');
  const button = document.getElementById('batchFetchAll');
  const checkButton = document.getElementById('checkResults');
  
  let summaryText = `\n🎉 HOÀN THÀNH!\n\n`;
  summaryText += `Tổng số requests: ${batchResults.summary.total}\n`;
  summaryText += `Thành công: ${batchResults.summary.success}\n`;
  summaryText += `Thất bại: ${batchResults.summary.failed}`;
  
  resultDiv.textContent = summaryText;
  
  // Lưu kết quả để export
  latestResponseData = {
    batchResults: batchResults.results,
    summary: batchResults.summary,
    timestamp: batchResults.timestamp
  };
  
  document.getElementById('exportToSheets').style.display = 'block';
  checkButton.style.display = 'none'; // Ẩn check button
  
  button.textContent = '✅ Hoàn thành!';
  setTimeout(() => {
    button.textContent = '🚀 Lấy Tất Cả Hotels';
    button.disabled = false;
  }, 3000);
}

// Check Results button - Manual check khi progress 100%
document.getElementById('checkResults').addEventListener('click', async () => {
  const button = document.getElementById('checkResults');
  button.disabled = true;
  button.textContent = '⏳ Đang check...';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getBatchProgress' });
    console.log('🔍 Manual check response:', response);
    console.log('🔍 Response.results:', response.results);
    console.log('🔍 Response.progress:', response.progress);
    
    // Debug storage trực tiếp
    const storageData = await chrome.storage.local.get(['batchProgress', 'batchResults']);
    console.log('🔍 Direct storage check:', storageData);
    
    if (response.summary && response.summary.completed) {
      console.log('✅ Found summary, showing batch summary');
      showBatchSummary(response.summary);
      button.style.display = 'none';
    } else {
      console.log('❌ No summary found');
      console.log('🔍 Available keys in response:', Object.keys(response));
      
      alert(`⚠️ Kết quả chưa sẵn sàng. Debug info:\n- Progress: ${JSON.stringify(response.progress)}\n- Summary: ${JSON.stringify(response.summary)}`);
      button.textContent = '🔍 Check Results';
      button.disabled = false;
    }
  } catch (error) {
    console.error('❌ Check results error:', error);
    alert('Lỗi: ' + error.message);
    button.textContent = '🔍 Check Results';
    button.disabled = false;
  }
});

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
    // Clear UI trước khi refresh
    clearUI();
    
    // Trigger background script để lấy cookies mới
    const response = await chrome.runtime.sendMessage({ action: 'refreshCookies' });
    console.log('Refresh response:', response);
    
    // Clear storage cũ
    await chrome.storage.local.remove(['batchProgress', 'batchSummary', 'batchResults']);
    
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

// Clear UI về trạng thái ban đầu
function clearUI() {
  const resultDiv = document.getElementById('result');
  const batchButton = document.getElementById('batchFetchAll');
  const checkButton = document.getElementById('checkResults');
  const exportButton = document.getElementById('exportToSheets');
  const exportStatus = document.getElementById('exportStatus');
  
  // Clear progress interval
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  
  // Reset UI elements
  resultDiv.textContent = '';
  batchButton.textContent = '🚀 Lấy Tất Cả Hotels';
  batchButton.disabled = true; // Sẽ được enable lại trong checkStatus
  checkButton.style.display = 'none';
  exportButton.style.display = 'none';
  exportStatus.style.display = 'none';
  
  // Clear data
  latestResponseData = null;
  
  console.log('🧹 UI cleared');
}

// Export to Google Sheets
document.getElementById('exportToSheets').addEventListener('click', async () => {
  const button = document.getElementById('exportToSheets');
  const statusDiv = document.getElementById('exportStatus');
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    alert('Extension chưa được load đúng cách');
    return;
  }
  
  // Nếu chưa có data, check trong storage
  if (!latestResponseData) {
    const response = await chrome.runtime.sendMessage({ action: 'getBatchProgress' });
    if (response.results) {
      latestResponseData = {
        batchResults: response.results.results,
        summary: response.results.summary,
        timestamp: response.results.timestamp
      };
    } else {
      alert('Không có dữ liệu để export. Vui lòng lấy giá phòng trước.');
      return;
    }
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
    
    // Gọi background script để batch fetch với date range (KHÔNG đợi response)
    chrome.runtime.sendMessage({
      action: 'batchFetchAllHotelsWithDates',
      params: baseParams,
      dates: dateStrings
    });
    
    // Hiển thị progress ngay lập tức
    resultDiv.textContent = `🔄 ĐANG BẮT ĐẦU...\n\n`;
    resultDiv.textContent += `📅 ${dates.length} ngày × 🏨 ${hotelCount} hotels = 📊 ${totalRequests} requests\n\n`;
    resultDiv.textContent += `💡 Bạn có thể đóng popup này, tiến trình sẽ tiếp tục chạy ngầm!`;
    
    button.disabled = true;
    button.textContent = '⏳ Đang crawl...';
    
    // Bắt đầu tracking progress
    await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1s để background bắt đầu
    startProgressTracking();
    
  } catch (error) {
    resultDiv.textContent = '❌ Lỗi: ' + error.message;
    button.textContent = '🚀 Lấy Tất Cả Hotels';
    button.disabled = false;
  }
});