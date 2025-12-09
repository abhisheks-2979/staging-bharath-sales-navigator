import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

/**
 * Cross-platform file downloader that works in both native APK and web/PWA
 * Uses Capacitor Filesystem API for native apps, falls back to browser download for web
 */

export interface DownloadOptions {
  filename: string;
  mimeType: string;
  blob?: Blob;
  base64Data?: string;
  showToast?: boolean;
}

/**
 * Downloads a file - uses native filesystem on Android/iOS, browser download on web
 */
export const downloadFile = async (options: DownloadOptions): Promise<boolean> => {
  const { filename, mimeType, blob, base64Data, showToast = true } = options;

  try {
    // Check if running in native app
    if (Capacitor.isNativePlatform()) {
      return await downloadNative(filename, mimeType, blob, base64Data, showToast);
    } else {
      return await downloadWeb(filename, mimeType, blob, base64Data, showToast);
    }
  } catch (error) {
    console.error('Download error:', error);
    if (showToast) {
      toast.error('Failed to download file');
    }
    return false;
  }
};

/**
 * Native download using Capacitor Filesystem
 */
const downloadNative = async (
  filename: string,
  mimeType: string,
  blob?: Blob,
  base64Data?: string,
  showToast = true
): Promise<boolean> => {
  try {
    // Request storage permission first
    const permResult = await Filesystem.checkPermissions();
    if (permResult.publicStorage !== 'granted') {
      const reqResult = await Filesystem.requestPermissions();
      if (reqResult.publicStorage !== 'granted') {
        toast.error('Storage permission required to save files');
        return false;
      }
    }

    // Convert blob to base64 if needed
    let data = base64Data;
    if (blob && !data) {
      data = await blobToBase64(blob);
    }

    if (!data) {
      throw new Error('No data to save');
    }

    // Remove data URL prefix if present
    if (data.includes(',')) {
      data = data.split(',')[1];
    }

    // Save to Downloads directory
    const result = await Filesystem.writeFile({
      path: filename,
      data: data,
      directory: Directory.Documents, // Use Documents as it's more universally accessible
      recursive: true,
    });

    console.log('File saved to:', result.uri);
    
    if (showToast) {
      toast.success(`File saved: ${filename}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('Native download error:', error);
    
    // Try alternative directory if Documents fails
    try {
      let data = base64Data;
      if (blob && !data) {
        data = await blobToBase64(blob);
      }
      if (data?.includes(',')) {
        data = data.split(',')[1];
      }
      
      const result = await Filesystem.writeFile({
        path: filename,
        data: data!,
        directory: Directory.External, // Try External as fallback
        recursive: true,
      });
      
      console.log('File saved to external:', result.uri);
      if (showToast) {
        toast.success(`File saved: ${filename}`);
      }
      return true;
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      if (showToast) {
        toast.error('Failed to save file. Check storage permissions.');
      }
      return false;
    }
  }
};

/**
 * Web download using blob URL and anchor element
 */
const downloadWeb = async (
  filename: string,
  mimeType: string,
  blob?: Blob,
  base64Data?: string,
  showToast = true
): Promise<boolean> => {
  try {
    let downloadBlob = blob;
    
    // Convert base64 to blob if needed
    if (!downloadBlob && base64Data) {
      downloadBlob = base64ToBlob(base64Data, mimeType);
    }

    if (!downloadBlob) {
      throw new Error('No data to download');
    }

    const url = URL.createObjectURL(downloadBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (showToast) {
      toast.success(`Downloaded: ${filename}`);
    }
    
    return true;
  } catch (error) {
    console.error('Web download error:', error);
    if (showToast) {
      toast.error('Failed to download file');
    }
    return false;
  }
};

/**
 * Convert Blob to base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert base64 string to Blob
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  // Remove data URL prefix if present
  let data = base64;
  if (data.includes(',')) {
    data = data.split(',')[1];
  }
  
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Download PDF file
 */
export const downloadPDF = async (blob: Blob, filename: string): Promise<boolean> => {
  return downloadFile({
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    mimeType: 'application/pdf',
    blob,
  });
};

/**
 * Download Excel file (for XLSX library)
 * XLSX.write returns a buffer, convert it to Blob first
 */
export const downloadExcel = async (
  workbook: any, 
  filename: string,
  XLSX: any
): Promise<boolean> => {
  try {
    // Write workbook to array buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    return downloadFile({
      filename: filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      blob,
    });
  } catch (error) {
    console.error('Excel download error:', error);
    toast.error('Failed to download Excel file');
    return false;
  }
};

/**
 * Download CSV file
 */
export const downloadCSV = async (csvContent: string, filename: string): Promise<boolean> => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  return downloadFile({
    filename: filename.endsWith('.csv') ? filename : `${filename}.csv`,
    mimeType: 'text/csv',
    blob,
  });
};
