// Configuration for Google Sheets API
const CONFIG = {
  // Google Apps Script Web App URL
  // Deploy Apps Script → Copy Web App URL
  // Thay thế URL bên dưới bằng URL của bạn
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxMAjqKtdxTn1ob_gS-JlMxJBnQZA_127ZUTVK_bIYfHlgRj7HWBci_OsSoylIojtEeUA/exec',
  TARGET_SHEET_NAME : 'AgodaData',
  // Spreadsheet ID (từ URL của Google Sheets)
  // https://docs.google.com/spreadsheets/d/1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw/edit
  SPREADSHEET_ID: '1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw',
  
  // === CŨ - Không dùng nữa ===
  // Google Sheets API Key - KHÔNG hoạt động cho write operations
  // GOOGLE_API_KEY: 'AIzaSyAYTwADRa9hjmc2SEq1ckK-H4OC0MeyOJU',
  // SHEETS_API_URL: 'https://sheets.googleapis.com/v4/spreadsheets'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
