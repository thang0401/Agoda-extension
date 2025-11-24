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
      console.log('🔍 DEBUG: Total masterRooms:', responseData.roomGridData.masterRooms.length);
      
      responseData.roomGridData.masterRooms.forEach((masterRoom, index) => {
        console.log(`\n📌 MasterRoom ${index}:`, masterRoom.name);
        console.log('  hasRoom:', masterRoom.hasRoom);
        console.log('  rooms array:', masterRoom.rooms ? `Array(${masterRoom.rooms.length})` : 'NULL/UNDEFINED');
        
        // ⭐ rooms[0] CHÍNH LÀ rate object (không có roomRates con!)
        if (!masterRoom.rooms || masterRoom.rooms.length === 0) {
          console.log('  ❌ SKIPPED - No rooms array');
          return;
        }
        
        // Lấy first rate trong rooms array
        const rate = masterRoom.rooms[0];
        console.log('  rate object:', rate ? 'EXISTS' : 'NULL');
        
        // ⭐ Pricing nằm trong pricePopupViewModel
        const pricing = rate.pricePopupViewModel;
        console.log('  pricing.agodaPrice:', pricing?.agodaPrice);
        console.log('  pricing.formattedAgodaPrice:', pricing?.formattedAgodaPrice);
        
        // ❌ SKIP nếu không có pricing (hết phòng thật sự)
        if (!pricing || (!pricing.agodaPrice && !pricing.formattedAgodaPrice)) {
          console.log('  ❌ SKIPPED - No pricing available');
          return; // Không export phòng hết phòng
        }
        
        console.log('  ✅ HAS pricing - Will export');
        
        // Get prices - SỬ DỤNG FIELD ĐÚNG
        // agodaPrice (number) = giá sau discount
        // propertyCrossoutRatePrice = giá gốc trước discount
        const displayPrice = pricing.agodaPrice || parseFloat(pricing.formattedAgodaPrice?.replace(/[.,]/g, '')) || 0;
        const crossedPrice = pricing.propertyCrossoutRatePrice || displayPrice;
        
        // Get discount - SỬ DỤNG FIELD ĐÚNG
        // discountPercentage = % discount dạng số (VD: 42)
        let discount = rate.discountPercentage || 0;
        
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
          masterRoom.name || 'N/A',
          rate.id || masterRoom.id || 'N/A',
          Math.round(displayPrice),
          Math.round(crossedPrice),
          discount,
          responseData.currencyCode || 'VND',
          rate.availability || 'N/A',
          rate.maxOccupancy || masterRoom.maxOccupancy || 'N/A'
        ]);
      });
      
      console.log(`\n📊 RESULT: Created ${rows.length - 1} room rows (excluding header)`);
    }
    
    // ⚠️ Nếu không có phòng nào được export (tất cả hết phòng hoặc không có masterRooms)
    // → Export 1 row "Hết phòng" để không bỏ sót hotel
    if (rows.length === 1) {
      console.log('⚠️ No rooms exported - Adding "Hết phòng" row');
      rows.push([
        timestamp,
        responseData.hotelId || responseData.propertyId || 'N/A',
        responseData.hotelListName || responseData.hotelInfo?.name || responseData.propertyName || 'N/A',
        responseData.checkInDate || responseData.hotelSearchCriteria?.checkInDate || responseData.checkIn || 'N/A',
        responseData.checkOutDate || responseData.hotelSearchCriteria?.checkOutDate || responseData.checkOut || 'N/A',
        'Hết phòng',
        '-',
        0, // Price = 0
        0, // Original price = 0
        0, // Discount = 0
        responseData.currencyCode || 'VND',
        0, // Available Rooms = 0
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
      const rowsBeforeHotel = rows.length; // Đánh dấu số rows trước khi xử lý hotel này
      
      if (responseData.roomGridData && responseData.roomGridData.masterRooms) {
        responseData.roomGridData.masterRooms.forEach(masterRoom => {
          // ⭐ rooms[0] CHÍNH LÀ rate object (không có roomRates con!)
          if (!masterRoom.rooms || masterRoom.rooms.length === 0) {
            return; // Skip nếu không có rooms array
          }
          
          const rate = masterRoom.rooms[0];
          
          // ⭐ Pricing nằm trong pricePopupViewModel
          const pricing = rate.pricePopupViewModel;
          
          // ❌ SKIP nếu không có pricing (hết phòng thật sự)
          if (!pricing || (!pricing.agodaPrice && !pricing.formattedAgodaPrice)) {
            return; // Không export phòng hết phòng
          }
          
          // Get prices - SỬ DỤNG FIELD ĐÚNG
          const displayPrice = pricing.agodaPrice || parseFloat(pricing.formattedAgodaPrice?.replace(/[.,]/g, '')) || 0;
          const crossedPrice = pricing.propertyCrossoutRatePrice || displayPrice;
          
          // Get discount - SỬ DỤNG FIELD ĐÚNG
          // discountPercentage = % discount dạng số (VD: 42)
          let discount = rate.discountPercentage || 0;
          
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
            masterRoom.name || 'N/A',
            rate.id || masterRoom.id || 'N/A',
            Math.round(displayPrice),
            Math.round(crossedPrice),
            discount,
            responseData.currencyCode || 'VND',
            rate.availability || 'N/A',
            rate.maxOccupancy || masterRoom.maxOccupancy || 'N/A'
          ]);
        });
      }
      
      // ⚠️ Nếu hotel này không export được phòng nào (tất cả hết phòng)
      // → Export 1 row "Hết phòng" để không bỏ sót hotel
      if (rows.length === rowsBeforeHotel) {
        rows.push([
          timestamp,
          responseData.hotelId || responseData.propertyId || 'N/A',
          responseData.hotelListName || responseData.hotelInfo?.name || responseData.propertyName || 'N/A',
          responseData.checkInDate || responseData.hotelSearchCriteria?.checkInDate || responseData.checkIn || 'N/A',
          responseData.checkOutDate || responseData.hotelSearchCriteria?.checkOutDate || responseData.checkOut || 'N/A',
          'Hết phòng',
          '-',
          0, // Price = 0
          0, // Original price = 0
          0, // Discount = 0
          responseData.currencyCode || 'VND',
          0, // Available Rooms = 0
          '-'  // Max Occupancy
        ]);
      }
    });

    return rows;
  }
}

// Export for use in background script
if (typeof window !== 'undefined') {
  window.GoogleSheetsAPI = GoogleSheetsAPI;
}
