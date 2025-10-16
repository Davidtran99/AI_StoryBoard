# 🎬 Kế Hoạch Tích Hợp Google Veo 2 API

> **Mục tiêu:** Cho phép app tạo video bằng Google Veo 2 trực tiếp từ Google AI Studio API, song song với Aivideoauto hiện tại.  
> **Thời gian dự kiến:** 2-3 giờ  
> **Độ ưu tiên:** HIGH  
> **Trạng thái:** 🟡 Planning

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Phân Tích Hiện Trạng](#phân-tích-hiện-trạng)
3. [Kế Hoạch Chi Tiết](#kế-hoạch-chi-tiết)
4. [Checklist Thực Hiện](#checklist-thực-hiện)
5. [Testing Plan](#testing-plan)
6. [Rollback Plan](#rollback-plan)

---

## 🎯 Tổng Quan

### Vấn Đề Hiện Tại

App hiện tại **chỉ hỗ trợ tạo video qua Aivideoauto** (dịch vụ bên thứ 3). Khi user chọn service = Google, app sẽ **chặn hoàn toàn** việc tạo video:

```typescript
// hooks/useStoryboard.ts:938-945
if (apiConfig.service === 'google') {
  onError("Chức năng tạo video không được hỗ trợ cho Google API...");
  return; // ← DỪNG LẠI - không tạo video
}
```

### Giải Pháp

Tích hợp **Google Veo 2 API** để:
- ✅ Tạo video trực tiếp từ Google (không qua bên thứ 3)
- ✅ Cho phép user chọn giữa Google Veo 2 và Aivideoauto
- ✅ Tận dụng code `veoService.ts` đã có sẵn

### Lợi Ích

| Tiêu Chí | Google Veo 2 | Aivideoauto |
|----------|--------------|-------------|
| **Tốc độ** | ⚡ Nhanh (8s/video) | 🐢 Chậm hơn |
| **Chất lượng** | 🎨 720p/1080p | 🎨 Tùy model |
| **Chi phí** | 💰 Theo Google pricing | 💰 Theo Aivideoauto |
| **Tích hợp** | ✅ Trực tiếp | 🔄 Qua API thứ 3 |
| **Độ tin cậy** | 🏆 Google infrastructure | ⚠️ Phụ thuộc bên thứ 3 |

---

## 🔍 Phân Tích Hiện Trạng

### 1. File `services/veoService.ts` - ĐÃ CÓ SẴN ✅

```typescript
// File này đã implement đầy đủ logic tạo video với Veo 2
export const generateVideoForScene = async (
  scene: Scene,
  apiKey: string,
  model: string,
  onProgress: (message: string) => void
): Promise<string> => {
  // ✅ Khởi tạo Google AI client
  const ai = new GoogleGenAI({ apiKey });
  
  // ✅ Gửi request với prompt + image
  let operation = await ai.models.generateVideos({
    model: model,
    prompt: scene.videoPrompt,
    image: { imageBytes, mimeType },
    config: { numberOfVideos: 1 }
  });
  
  // ✅ Poll operation status mỗi 10s
  while (!operation.done) {
    await sleep(POLLING_INTERVAL_MS);
    operation = await ai.operations.getVideosOperation({ operation });
    onProgress(messages[messageIndex++]);
  }
  
  // ✅ Download video về blob URL
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const fullUrl = `${downloadLink}&key=${apiKey}`;
  const response = await fetch(fullUrl);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  
  return blobUrl; // ← Trả về blob URL để hiển thị
}
```

**Kết luận:** File này **hoàn chỉnh**, chỉ cần import và gọi.

### 2. Hook `useApiConfig` - CẦN BỔ SUNG

**Hiện tại:**
```typescript
// hooks/useApiConfig.ts
const [googleModel, setGoogleModel] = useState<string>('imagen-4.0-generate-001');
// ← Chỉ có image model, CHƯA có video model
```

**Cần thêm:**
```typescript
const [googleVideoModel, setGoogleVideoModel] = useState<string>('veo-2.0-generate-001');
```

### 3. Hook `useStoryboard` - CẦN SỬA

**Hiện tại:**
```typescript
// hooks/useStoryboard.ts:938-945
const generateVideoForScene = useCallback(async (index: number) => {
  const scene = scenes[index];
  if (apiConfig.service === 'google') {
    onError("Chức năng tạo video không được hỗ trợ...");
    return; // ← CHẶN HOÀN TOÀN
  }
  
  // Chỉ chạy Aivideoauto
  const taskId = await aivideoauto.createVideo(...);
  // ... polling logic
}, [scenes, apiConfig, ...]);
```

**Cần sửa thành:**
```typescript
const generateVideoForScene = useCallback(async (index: number) => {
  const scene = scenes[index];
  
  await withBusyState('scenes', scene.id, async () => {
    updateScene(index, { videoStatus: 'generating', videoUrl: null });
    
    try {
      let videoUrl: string;
      
      if (apiConfig.service === 'google') {
        // ✅ NHÁNH MỚI: Gọi Veo 2
        videoUrl = await veoService.generateVideoForScene(
          scene,
          apiConfig.googleApiKey,
          apiConfig.googleVideoModel,
          (message) => updateScene(index, { videoStatusMessage: message })
        );
      } else {
        // ✅ Giữ nguyên logic Aivideoauto
        const taskId = await aivideoauto.createVideo(...);
        videoUrl = await poll(taskId);
      }
      
      updateScene(index, { videoStatus: 'done', videoUrl });
    } catch (error) {
      updateScene(index, { videoStatus: 'error', videoStatusMessage: error.message });
    }
  });
}, [scenes, apiConfig, ...]);
```

### 4. UI Settings - CẦN SỬA

**Hiện tại:**
```typescript
// components/settings/SettingsModal.tsx:159-171
{apiConfig.service === 'google' ? (
  <div className="flex h-10 ...">
    {t('videoNotSupportedByGoogle')} {/* ← Thông báo lỗi cứng */}
  </div>
) : (
  <Select value={apiConfig.aivideoautoVideoModel} ...>
    {/* Chọn video model cho Aivideoauto */}
  </Select>
)}
```

**Cần sửa thành:**
```typescript
{apiConfig.service === 'google' ? (
  apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured' ? (
    // ✅ Hiển thị dropdown khi key hợp lệ
    <Select value={apiConfig.googleVideoModel} onChange={e => apiConfig.setGoogleVideoModel(e.target.value)}>
      <option value="veo-2.0-generate-001">Veo 2 (8s, 720p/1080p)</option>
    </Select>
  ) : (
    // ✅ Hiển thị lỗi khi key chưa nhập/không hợp lệ
    <div className="flex h-10 ...">
      {t('videoNotSupportedByGoogle')} {/* Hoặc: "Vui lòng cấu hình API key hợp lệ" */}
    </div>
  )
) : (
  <Select value={apiConfig.aivideoautoVideoModel} ...>
    {/* Aivideoauto models */}
  </Select>
)}
```

### 5. Types - CẦN BỔ SUNG

**File: `types/index.ts`**

Thêm vào interface `ApiConfig`:
```typescript
export interface ApiConfig {
  // ... existing fields
  googleModel: string;           // ← Đã có (image model)
  setGoogleModel: (model: string) => void;
  
  // ✅ THÊM MỚI
  googleVideoModel: string;      // ← Video model
  setGoogleVideoModel: (model: string) => void;
}
```

---

## 📝 Kế Hoạch Chi Tiết

### BƯỚC 1: Thêm State Video Model cho Google

**File:** `hooks/useApiConfig.ts`

**Vị trí:** Sau dòng 26

**Code cần thêm:**
```typescript
// Dòng 26: const [googleModel, setGoogleModel] = useState<string>('imagen-4.0-generate-001');

// ✅ THÊM DÒNG NÀY:
const [googleVideoModel, setGoogleVideoModel] = useState<string>('veo-2.0-generate-001');
```

**Vị trí:** Trong return statement (dòng 176-201)

**Code cần thêm:**
```typescript
return {
  // ... existing fields
  googleModel,
  setGoogleModel,
  
  // ✅ THÊM 2 DÒNG NÀY:
  googleVideoModel,
  setGoogleVideoModel,
  
  // ... rest of fields
};
```

**Thời gian:** 5 phút  
**Độ khó:** ⭐ Dễ

---

### BƯỚC 2: Cập Nhật Types

**File:** `types/index.ts`

**Vị trí:** Trong interface `ApiConfig` (sau dòng 103)

**Code cần thêm:**
```typescript
export interface ApiConfig {
  // ... existing fields
  googleModel: string;
  setGoogleModel: (model: string) => void;
  
  // ✅ THÊM 2 DÒNG NÀY:
  googleVideoModel: string;
  setGoogleVideoModel: (model: string) => void;
  
  // ... rest of fields
}
```

**Thời gian:** 2 phút  
**Độ khó:** ⭐ Dễ

---

### BƯỚC 3: Sửa UI Settings

**File:** `components/settings/SettingsModal.tsx`

**Vị trí:** Dòng 158-171

**Code hiện tại:**
```typescript
<div>
  <Label>{t('videoModelLabel')}</Label>
  {apiConfig.service === 'google' ? (
    <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">
      {t('videoNotSupportedByGoogle')}
    </div>
  ) : (
    <Select value={apiConfig.aivideoautoVideoModel} onChange={e => apiConfig.setAivideoautoVideoModel(e.target.value)} disabled={apiConfig.aivideoautoStatus !== 'valid'}>
      {apiConfig.aivideoautoVideoModels.length > 0 ? (
        apiConfig.aivideoautoVideoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
      ) : (
        <option>Chưa có model video</option>
      )}
    </Select>
  )}
</div>
```

**Code mới:**
```typescript
<div>
  <Label>{t('videoModelLabel')}</Label>
  {apiConfig.service === 'google' ? (
    // ✅ KIỂM TRA TRẠNG THÁI API KEY
    (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') ? (
      // ✅ HIỂN THỊ DROPDOWN KHI KEY HỢP LỆ
      <Select 
        value={apiConfig.googleVideoModel} 
        onChange={e => apiConfig.setGoogleVideoModel(e.target.value)}
      >
        <option value="veo-2.0-generate-001">Veo 2 (8 giây, 720p/1080p)</option>
      </Select>
    ) : (
      // ✅ HIỂN THỊ LỖI KHI KEY CHƯA CẤU HÌNH
      <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">
        {t('videoNotSupportedByGoogle')}
      </div>
    )
  ) : (
    // ✅ GIỮ NGUYÊN LOGIC AIVIDEOAUTO
    <Select value={apiConfig.aivideoautoVideoModel} onChange={e => apiConfig.setAivideoautoVideoModel(e.target.value)} disabled={apiConfig.aivideoautoStatus !== 'valid'}>
      {apiConfig.aivideoautoVideoModels.length > 0 ? (
        apiConfig.aivideoautoVideoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
      ) : (
        <option>Chưa có model video</option>
      )}
    </Select>
  )}
</div>
```

**Thời gian:** 10 phút  
**Độ khó:** ⭐⭐ Trung bình

---

### BƯỚC 4: Tích Hợp Veo Service vào useStoryboard

**File:** `hooks/useStoryboard.ts`

#### 4.1. Import veoService

**Vị trí:** Đầu file (sau các import khác)

**Code cần thêm:**
```typescript
import * as gemini from '../services/geminiService';
import * as aivideoauto from '../services/aivideoautoService';
// ✅ THÊM DÒNG NÀY:
import * as veoService from '../services/veoService';
```

#### 4.2. Sửa hàm generateVideoForScene

**Vị trí:** Dòng 938-1012

**Code hiện tại:**
```typescript
const generateVideoForScene = useCallback(async (index: number) => {
  const scene = scenes[index];
  
  // ❌ ĐOẠN NÀY SẼ XÓA
  if (apiConfig.service === 'google') {
    onError("Chức năng tạo video không được hỗ trợ cho Google API trong phiên bản này. Vui lòng chuyển sang Aivideoauto trong Cài đặt.");
    return;
  }
  
  await withBusyState('scenes', scene.id, async () => {
    updateScene(index, { videoStatus: 'generating', videoUrl: null, videoStatusMessage: 'Đang khởi tạo...' });
    try {
      let videoUrl: string;
      
      // Chỉ có logic Aivideoauto
      const styleInstruction = getVideoStyleInstruction(videoStyle);
      const finalVideoPrompt = styleInstruction 
        ? `${styleInstruction}. ${scene.videoPrompt}`
        : scene.videoPrompt;
      const sceneWithStyledPrompt = { ...scene, videoPrompt: finalVideoPrompt };
      
      const taskId = await aivideoauto.createVideo(apiConfig.aivideoautoToken, sceneWithStyledPrompt, apiConfig.aivideoautoVideoModel);
      updateScene(index, { taskId, videoStatusMessage: 'Đã gửi yêu cầu...' });
      
      // Polling logic...
      videoUrl = await poll(Date.now());
      
      updateScene(index, { videoStatus: 'done', videoUrl, videoStatusMessage: undefined });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateScene(index, { videoStatus: 'error', videoStatusMessage: errorMessage });
      throw error;
    }
  });
}, [scenes, apiConfig, updateScene, withBusyState, videoStyle, onError]);
```

**Code mới:**
```typescript
const generateVideoForScene = useCallback(async (index: number) => {
  const scene = scenes[index];
  
  await withBusyState('scenes', scene.id, async () => {
    updateScene(index, { videoStatus: 'generating', videoUrl: null, videoStatusMessage: 'Đang khởi tạo...' });
    
    try {
      let videoUrl: string;
      
      // ✅ THÊM NHÁNH GOOGLE VEO 2
      if (apiConfig.service === 'google') {
        // Áp dụng style instruction
        const styleInstruction = getVideoStyleInstruction(videoStyle);
        const finalVideoPrompt = styleInstruction 
          ? `${styleInstruction}. ${scene.videoPrompt}`
          : scene.videoPrompt;
        
        const sceneWithStyledPrompt = { ...scene, videoPrompt: finalVideoPrompt };
        
        // Gọi Veo 2 API
        videoUrl = await veoService.generateVideoForScene(
          sceneWithStyledPrompt,
          apiConfig.googleApiKey,
          apiConfig.googleVideoModel,
          (message) => {
            // Callback để cập nhật progress
            updateScene(index, { videoStatusMessage: message });
          }
        );
        
      } else {
        // ✅ GIỮ NGUYÊN LOGIC AIVIDEOAUTO
        const styleInstruction = getVideoStyleInstruction(videoStyle);
        const finalVideoPrompt = styleInstruction 
          ? `${styleInstruction}. ${scene.videoPrompt}`
          : scene.videoPrompt;
        const sceneWithStyledPrompt = { ...scene, videoPrompt: finalVideoPrompt };
        
        const taskId = await aivideoauto.createVideo(
          apiConfig.aivideoautoToken, 
          sceneWithStyledPrompt, 
          apiConfig.aivideoautoVideoModel
        );
        updateScene(index, { taskId, videoStatusMessage: 'Đã gửi yêu cầu...' });
        
        // Polling
        const poll = async (startTime: number): Promise<string> => {
          const statusRes = await aivideoauto.checkVideoStatus(apiConfig.aivideoautoToken, taskId);
          const currentStatus = statusRes.status?.toLowerCase() || '';
          let statusMessage = '';
          
          if (currentStatus) {
            statusMessage = `Trạng thái: ${currentStatus}`;
            if (statusRes.queue_position) {
              statusMessage += ` (hàng chờ: ${statusRes.queue_position})`;
            } else if (statusRes.progress) {
              const progress = Number(statusRes.progress);
              if (progress > 0) {
                const elapsedTime = (Date.now() - startTime) / 1000;
                const totalTime = elapsedTime / (progress / 100);
                const eta = Math.round(totalTime - elapsedTime);
                statusMessage += ` (${progress}%) (Còn lại ~${formatDuration(eta)})`;
              } else {
                statusMessage += ` (${progress}%)`;
              }
            }
          }
          updateScene(index, { videoStatusMessage: statusMessage });
          
          const isSuccess = currentStatus.includes('success') || currentStatus.includes('completed') || currentStatus.includes('done');
          const isFailure = currentStatus.includes('fail') || currentStatus.includes('error');
          
          if (isSuccess && statusRes.download_url) {
            updateScene(index, { videoStatusMessage: 'Hoàn thành!' });
            return statusRes.download_url;
          }
          
          if (isFailure) {
            let userFriendlyMessage = 'Tạo video thất bại.';
            if (currentStatus.includes('unsafe')) {
              userFriendlyMessage = 'Nội dung không phù hợp hoặc vi phạm chính sách.';
            } else if (statusRes.message) {
              userFriendlyMessage = statusRes.message;
            }
            throw new Error(userFriendlyMessage);
          }
          
          await new Promise(res => setTimeout(res, POLLING_INTERVAL_MS));
          return poll(startTime);
        };
        
        videoUrl = await poll(Date.now());
      }
      
      // ✅ CẬP NHẬT TRẠNG THÁI THÀNH CÔNG
      updateScene(index, { videoStatus: 'done', videoUrl, videoStatusMessage: undefined });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateScene(index, { videoStatus: 'error', videoStatusMessage: errorMessage });
      throw error;
    }
  });
}, [scenes, apiConfig, updateScene, withBusyState, videoStyle]);
```

**Thời gian:** 30 phút  
**Độ khó:** ⭐⭐⭐ Khó

---

## ✅ Checklist Thực Hiện

### Pre-Implementation
- [ ] Backup code hiện tại
- [ ] Đọc kỹ tài liệu Google Veo 2 API
- [ ] Kiểm tra API key có hoạt động không
- [ ] Review code `veoService.ts`

### Implementation
- [ ] **BƯỚC 1**: Thêm `googleVideoModel` state vào `useApiConfig`
  - [ ] Thêm state declaration
  - [ ] Thêm vào return statement
  - [ ] Test: Check state có khởi tạo đúng không
  
- [ ] **BƯỚC 2**: Cập nhật `types/index.ts`
  - [ ] Thêm `googleVideoModel` vào `ApiConfig` interface
  - [ ] Thêm `setGoogleVideoModel` vào `ApiConfig` interface
  - [ ] Test: No TypeScript errors
  
- [ ] **BƯỚC 3**: Sửa UI Settings
  - [ ] Thay đổi logic hiển thị video model
  - [ ] Thêm điều kiện kiểm tra API key status
  - [ ] Test: UI hiển thị đúng khi key valid/invalid
  
- [ ] **BƯỚC 4**: Tích hợp Veo Service
  - [ ] Import `veoService`
  - [ ] Xóa đoạn code chặn Google
  - [ ] Thêm nhánh `if (apiConfig.service === 'google')`
  - [ ] Gọi `veoService.generateVideoForScene()`
  - [ ] Xử lý callback progress
  - [ ] Test: Video generation flow hoàn chỉnh

### Testing
- [ ] Test với Google Veo 2
  - [ ] Nhập API key hợp lệ
  - [ ] Chọn service = Google
  - [ ] Tạo 1 video đơn lẻ
  - [ ] Kiểm tra progress updates
  - [ ] Kiểm tra video preview
  - [ ] Test error handling
  
- [ ] Test với Aivideoauto (regression)
  - [ ] Chọn service = Aivideoauto
  - [ ] Tạo video vẫn hoạt động bình thường
  - [ ] Không có breaking changes
  
- [ ] Test edge cases
  - [ ] API key không hợp lệ
  - [ ] Network error
  - [ ] Video generation timeout
  - [ ] Batch generation (nhiều videos)

### Post-Implementation
- [ ] Code review
- [ ] Update documentation
- [ ] Commit changes với message rõ ràng
- [ ] Tag version mới

---

## 🧪 Testing Plan

### Test Case 1: Google Veo 2 - Happy Path

**Preconditions:**
- API key: `AIzaSyActTSjCzVNmUM7JD4sTmzbda7Eyp_xxRc`
- Service: Google
- Video model: `veo-2.0-generate-001`
- Scene có ảnh và videoPrompt

**Steps:**
1. Mở Settings → nhập API key → Save
2. Chọn service = Google
3. Chọn video model = Veo 2
4. Vào tab Timeline
5. Bấm "Tạo video" cho scene đầu tiên
6. Quan sát progress messages
7. Đợi video hoàn thành

**Expected Results:**
- ✅ videoStatus chuyển từ `idle` → `generating` → `done`
- ✅ Progress messages cập nhật mỗi 10s
- ✅ Video preview hiển thị sau khi done
- ✅ Có thể play/pause video
- ✅ Có thể download video

### Test Case 2: API Key Không Hợp Lệ

**Steps:**
1. Nhập API key sai
2. Chọn service = Google
3. Thử tạo video

**Expected Results:**
- ✅ Hiển thị error message rõ ràng
- ✅ videoStatus = `error`
- ✅ Không crash app

### Test Case 3: Batch Generation

**Steps:**
1. Tạo 5 scenes
2. Bấm "Generate All Videos"
3. Quan sát batch progress

**Expected Results:**
- ✅ Progress bar hiển thị (1/5, 2/5, ...)
- ✅ ETA tính toán chính xác
- ✅ Tất cả videos được tạo thành công

### Test Case 4: Regression - Aivideoauto

**Steps:**
1. Chọn service = Aivideoauto
2. Tạo video như bình thường

**Expected Results:**
- ✅ Vẫn hoạt động như cũ
- ✅ Không có breaking changes

---

## 🔙 Rollback Plan

### Nếu Có Lỗi Nghiêm Trọng

**Option 1: Revert Commit**
```bash
git log --oneline  # Tìm commit trước khi thay đổi
git revert <commit-hash>
git push
```

**Option 2: Feature Flag**
```typescript
// Thêm flag để tắt tính năng tạm thời
const ENABLE_VEO2 = false;

if (apiConfig.service === 'google' && ENABLE_VEO2) {
  // Veo 2 logic
} else if (apiConfig.service === 'google') {
  onError("Tính năng đang bảo trì...");
  return;
}
```

**Option 3: Hotfix**
- Sửa lỗi cụ thể
- Test nhanh
- Deploy hotfix

---

## 📊 Success Metrics

### Định Nghĩa Thành Công

- ✅ User có thể tạo video bằng Google Veo 2
- ✅ Không có regression bugs với Aivideoauto
- ✅ UI/UX mượt mà, không confusing
- ✅ Error handling tốt
- ✅ Performance không giảm

### Metrics Cần Theo Dõi

| Metric | Target | Actual |
|--------|--------|--------|
| Video generation success rate | > 95% | ___ |
| Average generation time | < 60s | ___ |
| Error rate | < 5% | ___ |
| User satisfaction | > 4/5 | ___ |

---

## 📚 Tài Liệu Tham Khảo

### Google Veo 2 API
- [Official Documentation](https://ai.google.dev/gemini-api/docs/video)
- [API Reference](https://ai.google.dev/api/generate-video)
- [Pricing](https://ai.google.dev/pricing)

### Internal Docs
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
- [veoService.ts](../services/veoService.ts)
- [useStoryboard.ts](../hooks/useStoryboard.ts)

---

## 🎉 Kết Luận

Sau khi hoàn thành kế hoạch này, app sẽ:
- ✅ Hỗ trợ **2 services** tạo video: Google Veo 2 và Aivideoauto
- ✅ User có **quyền lựa chọn** service phù hợp
- ✅ Code **clean, maintainable**, dễ mở rộng
- ✅ **Không breaking changes** với tính năng hiện tại

**Thời gian thực hiện:** 2-3 giờ  
**Độ khó:** Trung bình - Khó  
**Risk:** Thấp (có rollback plan)

---

**Prepared by:** AI Assistant  
**Date:** 2025-01-15  
**Version:** 1.0  
**Status:** 🟡 Awaiting Approval

---

**© 2025 AI Storyboard Team. All rights reserved.**

