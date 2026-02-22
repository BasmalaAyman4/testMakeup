/**
 * API client for mask generation via Next.js proxy
 * No CORS issues - works on production!
 */

class MaskAPIClient {
    constructor() {
      // Use Next.js API route (relative path)
      // This works on both localhost AND production
      this.baseURL = '/api/masks';
      this.cache = new Map();
      this.isProcessing = false;
    }
  
    /**
     * Convert video frame to blob
     */
    async videoFrameToBlob(videoElement, quality = 0.65) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw mirrored frame
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      
      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
    }
  
    /**
     * Generate masks from video frame
     * Uses Next.js API proxy - no CORS issues!
     */
    async generateMasks(videoElement) {
      // Throttle - don't spam the API
      if (this.isProcessing) {
        return this.cache.get('latest') || null;
      }
  
      this.isProcessing = true;
  
      try {
        // Convert frame to blob (optimized quality for faster upload)
        const blob = await this.videoFrameToBlob(videoElement, 0.65);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        
        // Send to Next.js API (which proxies to Python)
        const response = await fetch(this.baseURL, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to generate masks');
        }
        
        // Cache the result
        this.cache.set('latest', data);
        
        return data;
        
      } catch (error) {
        console.error('❌ Mask API error:', error);
        return null;
      } finally {
        this.isProcessing = false;
      }
    }
  
    /**
     * Load base64 mask as Image element
     */
    async loadMaskImage(base64Data) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64Data;
      });
    }
  
    /**
     * Health check
     */
    async healthCheck() {
      try {
        const response = await fetch(this.baseURL, {
          method: 'GET',
        });
        const data = await response.json();
        return data.status === 'healthy';
      } catch {
        return false;
      }
    }
  }
  
  export const maskAPI = new MaskAPIClient();