// Google Sheets API Helper
class GoogleSheetsAPI {
  constructor(apiKey, spreadsheetId) {
    this.apiKey = apiKey;
    this.spreadsheetId = spreadsheetId;
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  // Tạo sheet mới với tên là ngày hiện tại
  async createNewSheet(sheetName) {
    const url = `${this.baseUrl}/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`;
    
    const request = {
      requests: [{
        addSheet: {
          properties: {
            title: sheetName,
            gridProperties: {
              rowCount: 1000,
              columnCount: 20
            }
          }
        }
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create sheet: ${error.error.message}`);
      }

      const result = await response.json();
      const sheetId = result.replies[0].addSheet.properties.sheetId;
      return { success: true, sheetId, sheetName };
    } catch (error) {
      console.error('Error creating sheet:', error);
      return { success: false, error: error.message };
    }
  }

  // Ghi dữ liệu vào sheet
  async writeData(sheetName, data) {
    const range = `${sheetName}!A1`;
    const url = `${this.baseUrl}/${this.spreadsheetId}/values/${range}:append?valueInputOption=RAW&key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to write data: ${error.error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error writing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Format data từ Agoda response thành rows cho Google Sheets
  formatAgodaData(responseData) {
    const rows = [];
    
    // Header row
    rows.push([
      'Timestamp',
      'Hotel ID',
      'Hotel Name',
      'Check In',
      'Check Out',
      'Room Name',
      'Room ID',
      'Price (VND)',
      'Original Price (VND)',
      'Discount (%)',
      'Currency',
      'Adults',
      'Children',
      'Rooms',
      'Supplier',
      'Available Rooms',
      'Max Occupancy'
    ]);

    // Timestamp
    const timestamp = new Date().toLocaleString('vi-VN');
    
    // Parse room data
    if (responseData.roomGridData && responseData.roomGridData.masterRooms) {
      responseData.roomGridData.masterRooms.forEach(room => {
        // Lấy room rate đầu tiên (cheapest)
        const roomRate = room.roomRates && room.roomRates.length > 0 ? room.roomRates[0] : null;
        
        // Get prices
        const displayPrice = roomRate?.displayPrice || room.cheapestPrice || 0;
        const crossedPrice = roomRate?.crossedOutPrice || room.beforeDiscountPrice || displayPrice;
        
        // Calculate discount percentage
        let discount = 0;
        if (crossedPrice > displayPrice && crossedPrice > 0) {
          discount = Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100);
        }
        
        rows.push([
          timestamp,
          responseData.propertyId || 'N/A',
          responseData.propertyName || 'N/A',
          responseData.checkIn || 'N/A',
          responseData.checkOut || 'N/A',
          room.name || 'N/A',
          room.masterRoomId || 'N/A',
          Math.round(displayPrice),
          Math.round(crossedPrice),
          discount,
          responseData.currencyCode || 'VND',
          responseData.adults || 2,
          responseData.children || 0,
          responseData.rooms || 1,
          roomRate?.supplierId || 'N/A',
          room.availableRooms || 'N/A',
          room.maxOccupancy || 'N/A'
        ]);
      });
    } else {
      // Nếu không có room data, thêm 1 row basic info
      rows.push([
        timestamp,
        responseData.propertyId || 'N/A',
        responseData.propertyName || 'N/A',
        responseData.checkIn || 'N/A',
        responseData.checkOut || 'N/A',
        'No room data available',
        '-',
        '-',
        '-',
        '-',
        responseData.currencyCode || 'VND',
        responseData.adults || 2,
        responseData.children || 0,
        responseData.rooms || 1,
        '-',
        '-',
        '-'
      ]);
    }

    return rows;
  }

  // Main function: Tạo sheet mới và ghi data
  async exportToNewSheet(responseData) {
    // Tạo tên sheet theo ngày
    const now = new Date();
    const sheetName = `Data_${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}_${now.getHours()}-${now.getMinutes()}`;

    // Tạo sheet mới
    const createResult = await this.createNewSheet(sheetName);
    if (!createResult.success) {
      return createResult;
    }

    // Format data
    const formattedData = this.formatAgodaData(responseData);

    // Ghi data vào sheet
    const writeResult = await this.writeData(sheetName, formattedData);
    if (!writeResult.success) {
      return writeResult;
    }

    return {
      success: true,
      sheetName,
      rowCount: formattedData.length - 1, // Không tính header
      url: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=${createResult.sheetId}`
    };
  }
}

// Export for use in background script
if (typeof window !== 'undefined') {
  window.GoogleSheetsAPI = GoogleSheetsAPI;
}
