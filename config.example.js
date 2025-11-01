// Configuration for Google Sheets API
// Copy file này thành config.js và điền API Key của bạn

const CONFIG = {
  // Google Sheets API Key
  // Lấy từ: https://console.cloud.google.com/apis/credentials
  // Xem hướng dẫn chi tiết trong SETUP_GUIDE.md
  GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',
  
  // Spreadsheet ID (từ URL của Google Sheets)
  // https://docs.google.com/spreadsheets/d/1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw/edit
  SPREADSHEET_ID: '1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw',
  
  // Google Sheets API endpoint
  SHEETS_API_URL: 'https://sheets.googleapis.com/v4/spreadsheets'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
