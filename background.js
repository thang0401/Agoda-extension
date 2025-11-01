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
    
    // Lọc cookies quan trọng
    const importantCookies = cookies.filter(cookie => 
      ['sessionid', 'agoda.auth', 'agoda.member.token', 'csrf-token'].includes(cookie.name)
    );
    
    // Chuyển thành cookie string
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Lưu vào storage
    await chrome.storage.local.set({
      agodaCookies: cookieString,
      lastUpdate: new Date().toISOString(),
      isLoggedIn: cookies.some(c => c.name === 'agoda.auth')
    });
    
    console.log('✅ Cookies đã được lưu tự động');
    
  } catch (error) {
    console.error('❌ Lỗi khi lấy cookies:', error);
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
});

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
    
    // Call API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': agodaCookies,
        'Referer': 'https://www.agoda.com/'
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