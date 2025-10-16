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