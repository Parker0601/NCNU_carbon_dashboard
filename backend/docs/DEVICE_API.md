# 🖥️ 設備管理 API 文檔

## 📋 概述
設備管理 API 提供設備監控、問題回報、維修紀錄等功能。所有 API 都需要用戶認證。

## 🔐 認證
所有端點都需要在請求標頭中包含 JWT token：
```
Authorization: Bearer <your-jwt-token>
```

## 📡 API 端點

### 1. 獲取所有設備列表
**端點：** `GET /api/devices`

**描述：** 獲取系統中所有設備的完整資訊

**響應範例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "生產線A",
      "status": "1",
      "bootTime": "2024-01-01T00:00:00.000Z",
      "ratio": 0.85
    }
  ],
  "message": "Devices retrieved successfully"
}
```

---

### 2. 查看設備狀態
**端點：** `GET /api/devices/status`

**描述：** 獲取所有設備的基本狀態資訊 (ID, Status, Name)

**響應範例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "status": "1",
      "name": "生產線A"
    }
  ],
  "message": "Device status retrieved successfully"
}
```

---

### 3. 設備問題回報
**端點：** `POST /api/devices/report-issue`

**描述：** 回報設備問題（需要用戶登入）

**請求體：**
```json
{
  "deviceId": 1,
  "name": "設備名稱",
  "description": "問題描述"
}
```

**響應範例：**
```json
{
  "success": true,
  "data": {
    "issueId": 1,
    "deviceId": 1,
    "name": "設備名稱",
    "description": "問題描述",
    "status": "1",
    "createTime": "2024-01-01T00:00:00.000Z",
    "employee": {
      "id": 3,
      "name": "測試用戶1",
      "role": "1",
      "email": "test1@example.com"
    }
  },
  "message": "Issue reported successfully"
}
```

---

### 4. 寫入維修紀錄
**端點：** `POST /api/devices/maintenance`

**描述：** 記錄設備維修資訊（需要用戶登入）

**請求體：**
```json
{
  "deviceId": 1,
  "name": "設備名稱",
  "description": "維修描述",
  "endTime": "2024-01-01T00:00:00.000Z"
}
```

**響應範例：**
```json
{
  "success": true,
  "data": {
    "recordId": 1,
    "deviceId": 1,
    "name": "設備名稱",
    "description": "維修描述",
    "createTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:00:00.000Z",
    "employee": {
      "id": 3,
      "name": "測試用戶1",
      "role": "1",
      "email": "test1@example.com"
    }
  },
  "message": "Maintenance record created successfully"
}
```

---

### 5. 獲取設備維護歷史
**端點：** `GET /api/devices/maintenance-history`

**描述：** 獲取所有設備的維護歷史記錄

**響應範例：**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": 1,
      "deviceStatus": "1",
      "deviceName": "生產線A",
      "runRatio": 0.85,
      "runTime": "2024-01-01T00:00:00.000Z",
      "recordId": 1,
      "recordDescription": "維修描述",
      "recordCreateTime": "2024-01-01T00:00:00.000Z",
      "recordEndTime": "2024-01-01T00:00:00.000Z",
      "userName": "維修人員"
    }
  ],
  "message": "Maintenance history retrieved successfully"
}
```

---

### 6. 獲取特定設備的維護歷史
**端點：** `GET /api/devices/{id}/maintenance`

**描述：** 獲取指定設備的維護歷史記錄

**路徑參數：**
- `id`: 設備 ID

**響應格式：** 與維護歷史相同

---

### 7. 獲取特定設備資訊
**端點：** `GET /api/devices/{id}`

**描述：** 獲取指定設備的詳細資訊

**路徑參數：**
- `id`: 設備 ID

**響應範例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "1",
    "name": "生產線A",
    "bootTime": "2024-01-01T00:00:00.000Z",
    "ratio": 0.85
  },
  "message": "Device retrieved successfully"
}
```

---

### 8. 更新設備狀態
**端點：** `PUT /api/devices/{id}/status`

**描述：** 更新指定設備的狀態（需要用戶登入）

**路徑參數：**
- `id`: 設備 ID

**請求體：**
```json
{
  "status": "2"
}
```

**狀態值說明：**
- `1`: 正常運行
- `2`: 維護中
- `3`: 故障

**響應範例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "2",
    "name": "生產線A",
    "bootTime": "2024-01-01T00:00:00.000Z",
    "ratio": 0.85
  },
  "message": "Device status updated successfully"
}
```

---

### 9. 獲取維護統計
**端點：** `GET /api/devices/maintenance/stats`

**描述：** 獲取系統維護相關的統計資訊

**響應範例：**
```json
{
  "success": true,
  "data": {
    "totalMaintenance": 25,
    "totalDevices": 10,
    "totalIssues": 15
  },
  "message": "Maintenance statistics retrieved successfully"
}
```

## 📊 資料庫狀態值說明

### 設備狀態 (device_status)
- `1`: 正常運行
- `2`: 維護中  
- `3`: 故障

### 問題狀態 (issue_status)
- `1`: 待處理
- `2`: 處理中
- `3`: 已解決

### 用戶角色 (user_role)
- `1`: 一般用戶
- `2`: 管理員
- `3`: 審核員

## 🚨 錯誤處理

### 常見錯誤碼
- `400`: 請求參數錯誤
- `401`: 未認證
- `404`: 資源不存在
- `500`: 伺服器內部錯誤

### 錯誤響應格式
```json
{
  "success": false,
  "error": "錯誤訊息",
  "statusCode": 400
}
```

## 🔧 使用範例

### 使用 cURL 測試 API

```bash
# 1. 登入獲取 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 2. 獲取設備列表
curl -X GET http://localhost:3000/api/devices \
  -H "Authorization: Bearer <your-token>"

# 3. 回報設備問題
curl -X POST http://localhost:3000/api/devices/report-issue \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":1,"name":"生產線A","description":"設備異常"}'
```

## 📝 注意事項

1. **認證要求**：所有 API 都需要有效的 JWT token
2. **資料驗證**：所有輸入都會經過 Zod 驗證器驗證
3. **權限控制**：某些操作可能需要特定用戶角色
4. **資料完整性**：創建記錄時會檢查相關設備是否存在
5. **時間格式**：所有時間都使用 ISO 8601 格式
