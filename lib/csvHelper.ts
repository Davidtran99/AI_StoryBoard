/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Parses a CSV string into an array of objects.
 * Note: This is a simple parser and may fail with complex CSVs (e.g., with commas in values).
 */
export const parseCSV = (text: string): Record<string, string>[] => {
  try {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      // Simple regex to handle quoted values
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = values[i]?.trim().replace(/^"|"$/g, '') || '';
      });
      return obj;
    });
  } catch (error) {
    console.error("Failed to parse CSV:", error);
    return [];
  }
};