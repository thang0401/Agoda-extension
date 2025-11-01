// Import configurations
importScripts('config.js', 'googleSheets.js');

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
    
    // Check login status - linh hoạt hơn với nhiều cookie names
    const loginCookieNames = [
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
      lastUpdate: new Date().toISOString(),
      isLoggedIn: isLoggedIn,
      cookieCount: cookies.length
    });
    
    console.log('✅ Cookies đã được lưu:', {
      count: cookies.length,
      isLoggedIn: isLoggedIn,
      hasLoginCookie: hasLoginCookie
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
});

// Export data to Google Sheets
async function exportToGoogleSheets(responseData) {
  try {
    // Kiểm tra config
    if (!CONFIG.GOOGLE_API_KEY || CONFIG.GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('Chưa cấu hình Google API Key. Vui lòng cập nhật file config.js');
    }
    
    // Tạo instance của GoogleSheetsAPI
    const sheetsAPI = new GoogleSheetsAPI(CONFIG.GOOGLE_API_KEY, CONFIG.SPREADSHEET_ID);
    
    // Export data
    const result = await sheetsAPI.exportToNewSheet(responseData);
    
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
    const { agodaCookies } = await chrome.storage.local.get('agodaCookies');
    
    if (!agodaCookies) {
      throw new Error('Chưa có cookies, vui lòng đăng nhập Agoda');
    }
    
    // Build URL with params
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    // Get referer from params or use default
    const referer = params.referer || 'https://www.agoda.com/';
    
    // Call API with full headers like Postman
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json;charset=UTF-8',
        'Cookie': agodaCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': referer,
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}