// Tự động detect hotel info trên trang
function extractHotelInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Lấy hotel ID từ URL hoặc từ page data
  const hotelId = urlParams.get('hotel_id') || 
                  document.querySelector('[data-hotel-id]')?.dataset.hotelId;
  
  const checkIn = urlParams.get('checkIn');
  const checkOut = urlParams.get('checkOut');
  const adults = urlParams.get('adults') || '2';
  const children = urlParams.get('children') || '0';
  const rooms = urlParams.get('rooms') || '1';
  
  return {
    hotelId,
    checkIn,
    checkOut,
    adults,
    children,
    rooms,
    currentUrl: window.location.href
  };
}

// Lắng nghe message từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractHotelInfo') {
    const info = extractHotelInfo();
    sendResponse(info);
  }
  
  if (request.action === 'checkLoginStatus') {
    // Check xem user đã login chưa
    const isLoggedIn = document.querySelector('.HeaderMember') !== null;
    sendResponse({ isLoggedIn });
  }
});

// Tự động gửi thông báo khi detect được hotel page
if (window.location.pathname.includes('/hotel/')) {
  chrome.runtime.sendMessage({
    action: 'hotelPageDetected',
    data: extractHotelInfo()
  });
}