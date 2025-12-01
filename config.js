// Configuration for Google Sheets API
const CONFIG = {
  // Google Apps Script Web App URL
  // Deploy Apps Script → Copy Web App URL
  // Thay thế URL bên dưới bằng URL của anh
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxMAjqKtdxTn1ob_gS-JlMxJBnQZA_127ZUTVK_bIYfHlgRj7HWBci_OsSoylIojtEeUA/exec',
  TARGET_SHEET_NAME : 'AgodaData',
  // Spreadsheet ID (từ URL của Google Sheets)
  SPREADSHEET_ID: '1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw',
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
