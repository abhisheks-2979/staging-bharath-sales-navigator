/**
 * Utility to check internet upload speed
 * Returns upload speed in Mbps
 */

export const checkUploadSpeed = async (): Promise<number> => {
  try {
    // Try using Network Information API first (if available)
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      if (connection.downlink) {
        // downlink is in Mbps, upload is typically 10-30% of download for most connections
        // We'll use a conservative estimate of 40% of download speed
        const estimatedUpload = connection.downlink * 0.4;
        console.log(`Estimated upload speed from connection API: ${estimatedUpload} Mbps`);
        return estimatedUpload;
      }
    }

    // Fallback: Measure upload speed by uploading test data
    const testDataSize = 100 * 1024; // 100 KB
    const testData = new Blob([new ArrayBuffer(testDataSize)]);
    
    // Use a public echo endpoint to measure upload speed
    const startTime = performance.now();
    
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: testData,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    const endTime = performance.now();
    
    if (response.ok) {
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (testDataSize * 8) / (durationSeconds * 1000000); // Convert to Mbps
      console.log(`Measured upload speed: ${speedMbps.toFixed(2)} Mbps`);
      return speedMbps;
    }

    // If fetch fails, try a simpler download test as last resort
    return await measureDownloadSpeed();
  } catch (error) {
    console.error('Error checking upload speed:', error);
    // If all methods fail, try download speed as last resort
    return await measureDownloadSpeed();
  }
};

const measureDownloadSpeed = async (): Promise<number> => {
  try {
    const testFile = 'https://httpbin.org/bytes/100000'; // 100 KB test file
    const startTime = performance.now();
    
    const response = await fetch(testFile, { cache: 'no-store' });
    const blob = await response.blob();
    
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    const fileSizeBytes = blob.size;
    const speedMbps = (fileSizeBytes * 8) / (durationSeconds * 1000000);
    
    // Estimate upload as 40% of download
    const estimatedUpload = speedMbps * 0.4;
    console.log(`Estimated upload speed from download test: ${estimatedUpload.toFixed(2)} Mbps`);
    return estimatedUpload;
  } catch (error) {
    console.error('Error measuring download speed:', error);
    // Return a low default value if everything fails
    return 2; // Default to 2 Mbps as a fallback
  }
};
