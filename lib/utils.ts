/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Generates a simple unique ID.
 */
export const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Triggers a browser download for a given URL or content.
 * This function is designed to be robust across different URL types (http, data, blob).
 * @param content The URL string or Blob object to download.
 * @param filename The desired name of the downloaded file.
 */
export const download = (content: string | Blob, filename: string) => {
  const a = document.createElement('a');
  a.download = filename;
  a.style.display = 'none';
  
  let url: string;
  let needsCleanup = false;

  if (typeof content === 'string') {
    url = content;
  } else {
    // If content is a Blob or File
    url = window.URL.createObjectURL(content);
    needsCleanup = true;
  }

  a.href = url;
  
  // Appending to body is required for Firefox.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the object URL if we created it for this download.
  if (needsCleanup) {
    window.URL.revokeObjectURL(url);
  }
};


/**
 * Formats a duration in seconds into a MM:SS string.
 * @param seconds The total seconds.
 * @returns A formatted string like "02:35".
 */
export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '--:--';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

/**
 * Parses API error responses and returns user-friendly error messages in Vietnamese.
 * @param error The error object from API calls.
 * @returns A formatted error message in Vietnamese.
 */
export const parseApiError = (error: any): string => {
  // If it's already a string, return as is
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error object, check the message
  if (error instanceof Error) {
    const message = error.message;
    
    // Check if it's a JSON string that needs parsing
    if (message.includes('{') && message.includes('}')) {
      try {
        const parsed = JSON.parse(message);
        return parseApiError(parsed);
      } catch {
        // If parsing fails, return the original message
        return message;
      }
    }
    return message;
  }

  // If it's an object, try to extract meaningful error information
  if (typeof error === 'object' && error !== null) {
    // Google API error format
    if (error.error) {
      const apiError = error.error;
      if (apiError.message) {
        // Common Google API error messages
        if (apiError.message.includes('API key not valid')) {
          return 'API key không hợp lệ. Vui lòng kiểm tra lại API key.';
        }
        if (apiError.message.includes('quota')) {
          return 'Đã vượt quá giới hạn sử dụng API. Vui lòng thử lại sau.';
        }
        if (apiError.message.includes('billing')) {
          return 'Tài khoản chưa được thanh toán. Vui lòng kiểm tra billing.';
        }
        return apiError.message;
      }
      if (apiError.code) {
        return `Lỗi API (${apiError.code}): ${apiError.message || 'Không xác định'}`;
      }
    }

    // OpenAI API error format
    if (error.message) {
      if (error.message.includes('Invalid API key')) {
        return 'API key không hợp lệ. Vui lòng kiểm tra lại API key.';
      }
      if (error.message.includes('rate limit')) {
        return 'Quá giới hạn gọi API. Vui lòng thử lại sau.';
      }
      if (error.message.includes('insufficient_quota')) {
        return 'Tài khoản không đủ credits. Vui lòng nạp thêm tiền.';
      }
      return error.message;
    }

    // Higgsfield API error format
    if (error.detail) {
      if (error.detail === 'Not enough credits' || error.detail.includes('credits')) {
        return 'Tài khoản Higgsfield không đủ credits. Vui lòng nạp thêm credits.';
      }
      if (error.detail.includes('Unauthorized') || error.detail.includes('Invalid credentials')) {
        return 'Lỗi xác thực Higgsfield. Vui lòng kiểm tra API Key và Secret.';
      }
      if (error.detail.includes('Bad Request')) {
        return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin đầu vào.';
      }
      return `Lỗi Higgsfield: ${error.detail}`;
    }

    // HTTP status codes handling
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      switch (status) {
        case 400: return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        case 401: return 'Lỗi xác thực. Vui lòng kiểm tra API key.';
        case 403: return 'Tài khoản không đủ credits hoặc không có quyền truy cập.';
        case 404: return 'Không tìm thấy tài nguyên yêu cầu.';
        case 429: return 'Quá giới hạn gọi API. Vui lòng thử lại sau.';
        case 500: return 'Lỗi máy chủ. Vui lòng thử lại sau.';
        case 502: return 'Lỗi kết nối máy chủ. Vui lòng thử lại.';
        default: return `Lỗi ${status}: ${error.statusText || error.message || 'Không xác định'}`;
      }
    }

    // Generic object error
    if (error.status) {
      return `Lỗi ${error.status}: ${error.statusText || 'Không xác định'}`;
    }

    // Try to stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return 'Lỗi không xác định';
    }
  }

  // Fallback
  return String(error) || 'Lỗi không xác định';
};