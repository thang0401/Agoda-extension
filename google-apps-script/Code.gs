// Google Apps Script - Proxy để ghi data vào Google Sheets
// Deploy as Web App và dùng URL để call từ extension

function doPost(e) {
  try {
    // Parse request body
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // Get spreadsheet
    const spreadsheetId = '1IQMhIBZBH0tIuZJJ5AmhfNjmB6bIqN1rbC9AE0ExFkw';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    if (action === 'createSheet') {
      return createSheet(spreadsheet, data.sheetName);
    }
    
    if (action === 'writeData') {
      return writeData(spreadsheet, data.sheetName, data.values);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Tạo sheet mới
function createSheet(spreadsheet, sheetName) {
  try {
    const sheet = spreadsheet.insertSheet(sheetName);
    const sheetId = sheet.getSheetId();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      sheetId: sheetId,
      sheetName: sheetName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Ghi data vào sheet
function writeData(spreadsheet, sheetName, values) {
  try {
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }
    
    // Ghi data từ A1
    const range = sheet.getRange(1, 1, values.length, values[0].length);
    range.setValues(values);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rowsWritten: values.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'Agoda Extension Apps Script is running'
  })).setMimeType(ContentService.MimeType.JSON);
}
