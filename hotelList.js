// Danh sách 10 khách sạn cần crawl
const HOTEL_LIST = [
  {
    id: 1,
    hotelId: '10308484',
    name: 'Infinity Pool Signature - Saigon Riverside',
    url: 'https://www.agoda.com/vi-vn/infinity-pool-signature-freegym-pool-netflix-2/hotel/ho-chi-minh-city-vn.html'
  },
  {
    id: 2,
    hotelId: '10308320',
    name: 'Căn hộ Awesome CBD - Rivergate',
    url: 'https://www.agoda.com/vi-vn/infinity-pool-signature-freegym-pool/hotel/ho-chi-minh-city-vn.html'
  },
  {
    id: 3,
    hotelId: '36825405',
    name: 'Khách sạn Triple E Metro Bến Thành',
    url: 'https://www.agoda.com/vi-vn/triple-e-hotel-metro-ben-thanh/hotel/ho-chi-minh-city-vn.html'
  },
  {
    id: 4,
    hotelId: '48922220',
    name: 'Khách sạn M Village Lý Tự Trọng',
    url: 'https://www.agoda.com/vi-vn/m-village-ly-t-tr-ng/hotel/ho-chi-minh-city-vn.html'
  },
  {
    id: 5,
    hotelId: '29216846',
    name: 'Chez Mimosa Local',
    url: 'https://www.agoda.com/vi-vn/chez-mimosa-local-alley/hotel/ho-chi-minh-city-vn.html'
  }
];

// Export for use in other files
if (typeof window !== 'undefined') {
  window.HOTEL_LIST = HOTEL_LIST;
}
