// Import configurations
importScripts('config.js', 'googleSheets.js', 'hotelList.js');

// Lắng nghe khi user truy cập Agoda
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('agoda.com')) {
    // Lấy cookies tự động
    getCookiesAndSave();
  }
});

// Hàm lấy và lưu cookies
async function getCookiesAndSave() {
  try {
    // Lấy tất cả cookies từ agoda.com
    const cookies = await chrome.cookies.getAll({
      domain: '.agoda.com'
    });
    
    console.log('🔍 Total cookies found:', cookies.length);
    console.log('🔍 Cookie names:', cookies.map(c => c.name));
    
    // Chuyển thành cookie string
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Extract các cookies quan trọng cho headers
    const getCookieValue = (name) => {
      const cookie = cookies.find(c => c.name === name);
      return cookie ? cookie.value : null;
    };
    
    const importantCookies = {
      agAnalyticsSessionId: getCookieValue('agoda.analytics') || getCookieValue('ag-analytics-session-id'),
      sessionId: getCookieValue('ASP.NET_SessionId'),
      xsrfToken: getCookieValue('xsrf_token'),
      token: getCookieValue('token'),
      agodaL2: getCookieValue('agoda.l2')
    };
    
    // Check login status - linh hoạt hơn với nhiều cookie names
    const loginCookieNames = [
      'token',
      'agoda.l2',
      'agoda.auth',
      'agoda.member.token', 
      'member.token',
      'auth.token',
      'ag_auth',
      'sessionid'
    ];
    
    const hasLoginCookie = cookies.some(c => 
      loginCookieNames.some(name => c.name.toLowerCase().includes(name.toLowerCase()))
    );
    
    // Hoặc check nếu có nhiều hơn 5 cookies (thường khi đã login)
    const isLoggedIn = hasLoginCookie || cookies.length > 5;
    
    // Lưu vào storage
    await chrome.storage.local.set({
      agodaCookies: cookieString,
      importantCookies: importantCookies,
      lastUpdate: new Date().toISOString(),
      isLoggedIn: isLoggedIn,
      cookieCount: cookies.length
    });
    
    console.log('✅ Cookies đã được lưu:', {
      count: cookies.length,
      isLoggedIn: isLoggedIn,
      hasLoginCookie: hasLoginCookie,
      importantCookies: importantCookies
    });
    
    return { success: true, count: cookies.length, isLoggedIn };
    
  } catch (error) {
    console.error('❌ Lỗi khi lấy cookies:', error);
    throw error;
  }
}

// API để content script gọi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookies') {
    chrome.storage.local.get(['agodaCookies', 'isLoggedIn'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchPrice') {
    fetchPriceData(request.url, request.params).then(sendResponse);
    return true;
  }
  
  if (request.action === 'refreshCookies') {
    getCookiesAndSave().then((result) => {
      console.log('📤 Sending response:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('📤 Error response:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'exportToSheets') {
    exportToGoogleSheets(request.data).then(sendResponse);
    return true;
  }
  
  if (request.action === 'batchFetchAllHotels') {
    batchFetchAllHotels(request.params).then(sendResponse);
    return true;
  }
  
  if (request.action === 'batchFetchAllHotelsWithDates') {
    batchFetchAllHotelsWithDates(request.params, request.dates).then(sendResponse);
    return true;
  }
  
  if (request.action === 'getHotelList') {
    sendResponse({ success: true, hotels: HOTEL_LIST });
    return true;
  }
});

// Export data to Google Sheets
async function exportToGoogleSheets(responseData) {
  try {
    // Kiểm tra config
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec') {
      throw new Error('Chưa cấu hình Apps Script URL. Vui lòng:\n1. Deploy Apps Script\n2. Copy Web App URL\n3. Cập nhật APPS_SCRIPT_URL trong config.js');
    }
    
    // Tạo instance của GoogleSheetsAPI với Apps Script URL
    const sheetsAPI = new GoogleSheetsAPI(CONFIG.APPS_SCRIPT_URL, CONFIG.SPREADSHEET_ID);
    
    // Append data vào sheet cố định thay vì tạo sheet mới
    const targetSheetName = CONFIG.TARGET_SHEET_NAME || 'AgodaData';
    const result = await sheetsAPI.appendToSheet(responseData, targetSheetName);
    
    return result;
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}

// Hàm call API với cookies
async function fetchPriceData(baseUrl, params) {
  try {
    // Lấy cookies đã lưu
    const { agodaCookies, importantCookies } = await chrome.storage.local.get(['agodaCookies', 'importantCookies']);
    
    if (!agodaCookies) {
      throw new Error('Chưa có cookies, vui lòng đăng nhập Agoda');
    }
    
    // Build URL with params
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
      if (key !== 'referer') { // Không thêm referer vào URL
        url.searchParams.append(key, params[key]);
      }
    });
    
    // Get referer from params or use default
    const referer = params.referer || 'https://www.agoda.com/';
    
    // Generate correlation ID nếu không có
    const correlationId = generateUUID();
    
    // Extract analytics session ID từ cookie hoặc generate mới
    let analyticsSessionId = null;
    if (importantCookies?.agAnalyticsSessionId) {
      // Parse từ cookie agoda.analytics (format: Id=xxx&Signature=...)
      const match = importantCookies.agAnalyticsSessionId.match(/Id=(\d+)/);
      analyticsSessionId = match ? match[1] : Date.now().toString();
    } else {
      analyticsSessionId = Date.now().toString();
    }
    
    // Call API with full headers giống như browser thật
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/json;charset=UTF-8',
        'Cookie': agodaCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': 'https://www.agoda.com',
        
        // Agoda specific headers - QUAN TRỌNG
        'ag-analytics-session-id': analyticsSessionId,
        'ag-correlation-id': correlationId,
        'ag-language-id': '24', // Vietnamese
        'ag-language-locale': 'vi-vn',
        'ag-request-attempt': '1',
        'cr-currency-code': 'VND',
        'cr-currency-id': '78',
        'x-requested-with': 'XMLHttpRequest',
        
        // Security headers
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // DEBUG: Log API response để kiểm tra fields
    console.log('🔍 DEBUG API Response:', data);
    console.log('🔍 Hotel Info:', {
      hotelId: data.hotelId,
      propertyId: data.propertyId,
      hotelName: data.hotelInfo?.name,
      checkInDate: data.hotelSearchCriteria?.checkInDate,
      checkOutDate: data.hotelSearchCriteria?.checkOutDate
    });
    
    if (data.roomGridData?.masterRooms?.[0]?.roomRates?.[0]) {
      const firstRoom = data.roomGridData.masterRooms[0];
      const firstRate = firstRoom.roomRates[0];
      console.log('🔍 First Room Rate Fields:', {
        displayPrice: firstRate.displayPrice,
        formattedAgodaPrice: firstRate.formattedAgodaPrice,
        crossedOutPrice: firstRate.crossedOutPrice,
        percentageDiscountNumber: firstRate.percentageDiscountNumber,
        discountPercentage: firstRate.discountPercentage,
        maxFreeChildren: firstRate.maxFreeChildren,
        maxOccupancy: firstRate.maxOccupancy,
        roomMaxOccupancy: firstRoom.maxOccupancy,
        allRateFields: Object.keys(firstRate)
      });
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('fetchPriceData error:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Generate UUID cho correlation ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Batch fetch tất cả hotels
async function batchFetchAllHotels(baseParams) {
  const results = [];
  const errors = [];
  
  console.log('🚀 Bắt đầu batch fetch cho', HOTEL_LIST.length, 'hotels');
  
  for (let i = 0; i < HOTEL_LIST.length; i++) {
    const hotel = HOTEL_LIST[i];
    
    // Skip hotels chưa có hotelId
    if (!hotel.hotelId) {
      console.log(`⏭️ Skip hotel ${hotel.id} - chưa có hotelId`);
      continue;
    }
    
    try {
      console.log(`📥 [${i + 1}/${HOTEL_LIST.length}] Fetching hotel: ${hotel.name || hotel.hotelId}`);
      
      // Merge params với hotel ID
      const params = {
        ...baseParams,
        hotel_id: hotel.hotelId,
        referer: hotel.url || baseParams.referer
      };
      
      // Call API
      const response = await fetchPriceData(
        'https://www.agoda.com/api/cronos/property/BelowFoldParams/GetSecondaryData',
        params
      );
      
      if (response.success) {
        // Thêm metadata
        response.data.hotelListId = hotel.id;
        response.data.hotelListName = hotel.name;
        results.push(response.data);
        console.log(`✅ [${i + 1}/${HOTEL_LIST.length}] Success: ${hotel.name || hotel.hotelId}`);
      } else {
        errors.push({
          hotel: hotel.name || hotel.hotelId,
          error: response.error
        });
        console.log(`❌ [${i + 1}/${HOTEL_LIST.length}] Failed: ${response.error}`);
      }
      
      // Delay 1-2s giữa các requests để tránh rate limit
      if (i < HOTEL_LIST.length - 1) {
        const delay = 1000 + Math.random() * 1000; // 1-2 seconds
        console.log(`⏳ Waiting ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      errors.push({
        hotel: hotel.name || hotel.hotelId,
        error: error.message
      });
      console.error(`❌ [${i + 1}/${HOTEL_LIST.length}] Error:`, error);
    }
  }
  
  console.log('🎉 Batch fetch hoàn thành:', {
    total: HOTEL_LIST.length,
    success: results.length,
    failed: errors.length
  });
  
  return {
    success: true,
    results: results,
    errors: errors,
    summary: {
      total: HOTEL_LIST.length,
      success: results.length,
      failed: errors.length
    }
  };
}

// Batch fetch tất cả hotels với date range
async function batchFetchAllHotelsWithDates(baseParams, dates) {
  const results = [];
  const errors = [];
  
  const activeHotels = HOTEL_LIST.filter(h => h.hotelId);
  const totalRequests = activeHotels.length * dates.length;
  
  console.log(`🚀 Bắt đầu batch fetch: ${activeHotels.length} hotels × ${dates.length} ngày = ${totalRequests} requests`);
  
  let requestCount = 0;
  
  // Loop qua từng ngày
  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const checkInDate = dates[dateIndex];
    
    // Tính checkOut = checkIn + 1 ngày
    const checkInObj = new Date(checkInDate);
    const checkOutObj = new Date(checkInObj);
    checkOutObj.setDate(checkOutObj.getDate() + 1);
    const checkOutDate = checkOutObj.toISOString().split('T')[0];
    
    console.log(`\n📅 Ngày ${dateIndex + 1}/${dates.length}: Check-in ${checkInDate}, Check-out ${checkOutDate}`);
    
    // Loop qua từng hotel
    for (let hotelIndex = 0; hotelIndex < activeHotels.length; hotelIndex++) {
      const hotel = activeHotels[hotelIndex];
      requestCount++;
      
      try {
        console.log(`📥 [${requestCount}/${totalRequests}] Hotel: ${hotel.name || hotel.hotelId} | Date: ${checkInDate}`);
        
        // Merge params với hotel ID và dates
        const params = {
          ...baseParams,
          hotel_id: hotel.hotelId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          referer: hotel.url || baseParams.referer
        };
        
        // Call API
        const response = await fetchPriceData(
          'https://www.agoda.com/api/cronos/property/BelowFoldParams/GetSecondaryData',
          params
        );
        
        if (response.success) {
          // Thêm metadata
          response.data.hotelListId = hotel.id;
          response.data.hotelListName = hotel.name;
          response.data.checkInDate = checkInDate;
          response.data.checkOutDate = checkOutDate;
          results.push(response.data);
          console.log(`✅ [${requestCount}/${totalRequests}] Success`);
        } else {
          errors.push({
            hotel: hotel.name || hotel.hotelId,
            date: checkInDate,
            error: response.error
          });
          console.log(`❌ [${requestCount}/${totalRequests}] Failed: ${response.error}`);
        }
        
        // Delay 2-4s giữa các requests để tránh rate limit
        if (requestCount < totalRequests) {
          const delay = 2000 + Math.random() * 2000; // 2-4 seconds
          console.log(`⏳ Waiting ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        errors.push({
          hotel: hotel.name || hotel.hotelId,
          date: checkInDate,
          error: error.message
        });
        console.error(`❌ [${requestCount}/${totalRequests}] Error:`, error);
      }
    }
  }
  
  console.log('\n🎉 Batch fetch hoàn thành:', {
    totalRequests: totalRequests,
    success: results.length,
    failed: errors.length
  });
  
  return {
    success: true,
    results: results,
    errors: errors,
    summary: {
      total: totalRequests,
      success: results.length,
      failed: errors.length
    }
  };
}