<!-- 80a387d3-f856-473d-8c77-504e4372a5f9 670fdb82-db14-4f9e-87f0-f4b0ca92631d -->
# Fix Higgsfield API Key Validation

## Vấn đề hiện tại

- API trả về `{"error": "unidentified route"}` khi gọi `/api/higgsfield/models`
- User chưa test API key trực tiếp với Higgsfield API
- Cần hiển thị thông báo lỗi chi tiết hơn
- Cần validate cả `/v1/models` và `/v1/soul-styles`

## Giải pháp

### 1. Cải thiện error handling trong `vite.config.ts`

**File**: `vite.config.ts` (lines 116-140, 202-225)

Thêm logging chi tiết và parse response error:

- Log request headers để debug
- Parse JSON error từ upstream API
- Trả về error message cụ thể thay vì generic "upstream_error"

### 2. Thêm endpoint test mới trong `services/higgsfieldService.ts`

**File**: `services/higgsfieldService.ts` (lines 24-48)

Tạo function `testConnection()` để:

- Test cả `/api/higgsfield/models` và `/api/higgsfield/soul-styles`
- Trả về thông tin chi tiết về lỗi (status code, message, endpoint failed)
- Update `validateApiKey()` để sử dụng function mới này

### 3. Cập nhật validation flow trong `useApiConfig.ts`

**File**: `hooks/useApiConfig.ts` (lines 348-364)

Cải thiện `saveHiggsfieldApiKey()`:

- Validate ngay khi user nhập cả key và secret
- Hiển thị error message chi tiết từ API
- Retry với fallback endpoint nếu primary endpoint fail
- Log response để debug

### 4. Cải thiện UI error message trong `SettingsModal.tsx`

**File**: `components/settings/SettingsModal.tsx` (lines 309-325)

Thêm hiển thị:

- Error message cụ thể từ API
- Hướng dẫn debug (kiểm tra key format, network, etc.)
- Link đến trang lấy API key

## Testing Plan

1. Test với key rỗng → Hiển thị "missing key"
2. Test với key sai format → Hiển thị error từ API
3. Test với key hợp lệ → Load models và styles thành công
4. Kiểm tra console logs để debug connection issues

### To-dos

- [ ] Cải thiện error handling trong vite.config.ts cho Higgsfield endpoints
- [ ] Thêm testConnection() function trong higgsfieldService.ts
- [ ] Cập nhật validation flow trong useApiConfig.ts
- [ ] Cải thiện UI error messages trong SettingsModal.tsx
- [ ] Test validation với các trường hợp khác nhau