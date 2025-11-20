// Google Sheets API Helper - Using Apps Script
class GoogleSheetsAPI {
  constructor(appsScriptUrl, spreadsheetId) {
    this.appsScriptUrl = appsScriptUrl;
    this.spreadsheetId = spreadsheetId;
  }

  // Tạo sheet mới với tên là ngày hiện tại
  async createNewSheet(sheetName) {
    try {
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'createSheet',
          sheetName: sheetName
        }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      return { 
        success: true, 
        sheetId: result.sheetId, 
        sheetName: result.sheetName 
      };
      
    } catch (error) {
      console.error('Error creating sheet:', error);
      return { success: false, error: error.message };
    }
  }

  // Ghi dữ liệu vào sheet
  async writeData(sheetName, data) {
    try {
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'writeData',
          sheetName: sheetName,
          values: data
        }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
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
        
        // Get prices - SỬ DỤNG FIELD ĐÚNG
        // formattedAgodaPrice = giá sau discount (giá user thấy trên web)
        // crossedOutPrice = giá gốc trước discount
        const displayPrice = roomRate?.formattedAgodaPrice || roomRate?.displayPrice || room.cheapestPrice || 0;
        const crossedPrice = roomRate?.crossedOutPrice || room.beforeDiscountPrice || displayPrice;
        
        // Get discount - SỬ DỤNG FIELD ĐÚNG
        // discountPercentage = % discount dạng số (VD: 73)
        // percentageDiscountNumber = string "73% off" (KHÔNG dùng)
        let discount = roomRate?.discountPercentage || 0;
        
        // Fallback: tính discount nếu không có field
        if (discount === 0 && crossedPrice > displayPrice && crossedPrice > 0) {
          discount = Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100);
        }
        
        rows.push([
          timestamp,
          responseData.hotelId || responseData.propertyId || 'N/A',
          responseData.hotelListName || responseData.hotelInfo?.name || responseData.propertyName || 'N/A',
          responseData.hotelSearchCriteria?.checkInDate || responseData.checkIn || 'N/A',
          responseData.hotelSearchCriteria?.checkOutDate || responseData.checkOut || 'N/A',
          room.name || 'N/A',
          roomRate?.roomId || room.roomId || room.masterRoomId || 'N/A',
          Math.round(displayPrice),
          Math.round(crossedPrice),
          discount,
          responseData.currencyCode || 'VND',
          roomRate?.availableRooms || room.availableRooms || 'N/A',
          roomRate?.maxOccupancy || room.maxOccupancy || 'N/A'
        ]);
      });
    } else {
      // Hotel hết phòng - export với thông tin "Hết phòng"
      rows.push([
        timestamp,
        responseData.hotelId || responseData.propertyId || 'N/A',
        responseData.hotelListName || responseData.hotelInfo?.name || responseData.propertyName || 'N/A',
        responseData.checkInDate || responseData.hotelSearchCriteria?.checkInDate || responseData.checkIn || 'N/A',
        responseData.checkOutDate || responseData.hotelSearchCriteria?.checkOutDate || responseData.checkOut || 'N/A',
        'Hết phòng',
        '-',
        '', // Price trống
        '', // Original price trống  
        '', // Discount trống
        responseData.currencyCode || 'VND',
        '0', // Available Rooms = 0
        '-'  // Max Occupancy
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

    // Format data - check if batch results or single hotel
    let formattedData;
    if (responseData.batchResults) {
      // Batch results - merge tất cả hotels
      formattedData = this.formatBatchData(responseData.batchResults);
    } else {
      // Single hotel
      formattedData = this.formatAgodaData(responseData);
    }

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

  // Append data vào sheet cố định (không tạo sheet mới)
  async appendToSheet(responseData, targetSheetName) {
    try {
      // Format data - check if batch results or single hotel
      let formattedData;
      if (responseData.batchResults) {
        // Batch results - merge tất cả hotels
        formattedData = this.formatBatchData(responseData.batchResults);
      } else {
        // Single hotel
        formattedData = this.formatAgodaData(responseData);
      }

      // Append data vào sheet
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'appendData',
          sheetName: targetSheetName,
          values: formattedData
        }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      return {
        success: true,
        sheetName: targetSheetName,
        rowCount: result.rowsWritten,
        totalRows: result.totalRows,
        url: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`
      };
      
    } catch (error) {
      console.error('Error appending data:', error);
      return { success: false, error: error.message };
    }
  }

  // Format batch data từ nhiều hotels
  formatBatchData(batchResults) {
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
      'Available Rooms',
      'Max Occupancy'
    ]);

    // Timestamp
    const timestamp = new Date().toLocaleString('vi-VN');
    
    // Loop through each hotel
    batchResults.forEach(responseData => {
      if (responseData.roomGridData && responseData.roomGridData.masterRooms) {
        responseData.roomGridData.masterRooms.forEach(room => {
          const roomRate = room.roomRates && room.roomRates.length > 0 ? room.roomRates[0] : null;
          
          // Get prices - SỬ DỤNG FIELD ĐÚNG
          const displayPrice = roomRate?.formattedAgodaPrice || roomRate?.displayPrice || room.cheapestPrice || 0;
          const crossedPrice = roomRate?.crossedOutPrice || room.beforeDiscountPrice || displayPrice;
          
          // Get discount - SỬ DỤNG FIELD ĐÚNG
          // discountPercentage = % discount dạng số (VD: 73)
          let discount = roomRate?.discountPercentage || 0;
          
          // Fallback: tính discount nếu không có field
          if (discount === 0 && crossedPrice > displayPrice && crossedPrice > 0) {
            discount = Math.round(((crossedPrice - displayPrice) / crossedPrice) * 100);
          }
          
          rows.push([
            timestamp,
            responseData.hotelId || responseData.propertyId || 'N/A',
            responseData.hotelListName || responseData.hotelInfo?.name || responseData.propertyName || 'N/A',
            responseData.hotelSearchCriteria?.checkInDate || responseData.checkIn || 'N/A',
            responseData.hotelSearchCriteria?.checkOutDate || responseData.checkOut || 'N/A',
            room.name || 'N/A',
            roomRate?.roomId || room.roomId || room.masterRoomId || 'N/A',
            Math.round(displayPrice),
            Math.round(crossedPrice),
            discount,
            responseData.currencyCode || 'VND',
            roomRate?.availableRooms || room.availableRooms || 'N/A',
            roomRate?.maxOccupancy || room.maxOccupancy || 'N/A'
          ]);
        });
      }
    });

    return rows;
  }
}

// Export for use in background script
if (typeof window !== 'undefined') {
  window.GoogleSheetsAPI = GoogleSheetsAPI;
}
