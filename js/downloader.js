// downloader.js - Advanced download management system
const DownloadManager = {
    currentDownload: null,
    downloadQueue: [],
    isDownloading: false,
    
    // !!! IMPORTANT: Change this to your actual Render URL !!!
    API_BASE_URL: 'https://youtube-clipping.onrender.com', // Replace with YOUR Render URL

    init: function() {
        this.setupEventListeners();
        console.log('Download Manager initialized with API:', this.API_BASE_URL);
    },

    setupEventListeners: function() {
        // Listen for paste events
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Auto-fetch video info when URL is pasted or changed
        const urlInput = document.getElementById('videoUrl');
        if (urlInput) {
            urlInput.addEventListener('paste', (e) => {
                setTimeout(() => this.fetchVideoInfo(), 100);
            });
            urlInput.addEventListener('input', () => {
                // Clear previous video info when URL changes
                clearTimeout(this.urlInputTimeout);
                this.urlInputTimeout = setTimeout(() => {
                    if (urlInput.value) {
                        this.fetchVideoInfo();
                    }
                }, 1000);
            });
        }

        // Add keyboard shortcut (Ctrl+Enter to download)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.startDownload();
            }
        });
    },

    handlePaste: function(e) {
        const pastedText = e.clipboardData.getData('text');
        if (this.isYouTubeUrl(pastedText)) {
            document.getElementById('videoUrl').value = pastedText;
            this.fetchVideoInfo();
        }
    },

    isYouTubeUrl: function(url) {
        if (!url) return false;
        const patterns = [
            /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=/,
            /^(https?:\/\/)?(www\.)?youtu\.be\//,
            /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\//,
            /^(https?:\/\/)?(www\.)?youtube\.com\/embed\//,
            /^(https?:\/\/)?(www\.)?youtube\.com\/v\//
        ];
        return patterns.some(pattern => pattern.test(url));
    },

    fetchVideoInfo: async function() {
        const url = document.getElementById('videoUrl').value.trim();
        if (!url) return;
        
        if (!this.isYouTubeUrl(url)) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        this.showProgress('Fetching video information...', 10);

        try {
            console.log('Fetching info for:', url);
            
            const response = await fetch(`${this.API_BASE_URL}/api/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url }),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                this.showNotification(data.error, 'error');
                this.hideProgress();
                return;
            }

            console.log('Video info received:', data);
            
            this.hideProgress();
            this.showVideoInfo({
                title: data.title || 'Unknown Title',
                duration: data.duration || 0,
                thumbnail: data.thumbnail || 'https://img.youtube.com/vi/default.jpg'
            });
            
            // Update available qualities based on what the video supports
            if (data.formats && data.formats.length > 0) {
                this.updateQualityOptions(data.formats);
            }
            
            this.showNotification('Video information loaded!', 'success');
        } catch (error) {
            console.error('Fetch error:', error);
            this.hideProgress();
            this.showNotification('Failed to fetch video information. Make sure your server is running at: ' + this.API_BASE_URL, 'error');
        }
    },

    updateQualityOptions: function(formats) {
        // Get available qualities from the video
        const availableQualities = formats.map(f => f.quality);
        
        // Update quality manager with available qualities
        if (typeof QualityManager !== 'undefined') {
            // You can add a method to QualityManager to update available qualities
            console.log('Available qualities:', availableQualities);
        }
    },

    showVideoInfo: function(info) {
        const videoInfo = document.getElementById('videoInfo');
        const titleEl = document.getElementById('videoTitle');
        const durationEl = document.getElementById('videoDuration');
        const thumbnailEl = document.getElementById('thumbnail');
        
        if (titleEl) titleEl.textContent = info.title;
        if (durationEl) durationEl.textContent = `Duration: ${this.formatDuration(info.duration)}`;
        if (thumbnailEl) thumbnailEl.src = info.thumbnail;
        
        if (videoInfo) videoInfo.style.display = 'flex';
        
        // Set duration in clipper
        if (typeof ClipperManager !== 'undefined') {
            ClipperManager.setVideoDuration(info.duration);
        }
    },

    formatDuration: function(seconds) {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },

    startDownload: async function() {
        const url = document.getElementById('videoUrl').value.trim();
        if (!this.isYouTubeUrl(url)) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        const quality = QualityManager.getSelectedQuality();
        const clipParams = ClipperManager.getClipParameters();

        // Validate clip times if clipping is enabled
        if (clipParams.enabled) {
            if (!clipParams.startTime && clipParams.startTime !== 0) {
                this.showNotification('Please set a start time for clipping', 'error');
                return;
            }
            if (!clipParams.endTime) {
                this.showNotification('Please set an end time for clipping', 'error');
                return;
            }
            if (clipParams.startTime >= clipParams.endTime) {
                this.showNotification('End time must be after start time', 'error');
                return;
            }
        }

        this.isDownloading = true;
        this.showProgress('Initializing download...', 0);

        try {
            console.log('Starting download:', { url, quality, clipParams });

            const response = await fetch(`${this.API_BASE_URL}/api/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    quality: quality,
                    clip: clipParams.enabled ? {
                        enabled: true,
                        startTime: clipParams.startTime,
                        endTime: clipParams.endTime
                    } : { enabled: false }
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Download failed: ${response.status}`);
            }

            // Get the blob from response
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('Downloaded file is empty');
            }

            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = this.generateOutputFilename(url, quality, clipParams);
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);

            this.isDownloading = false;
            this.hideProgress();
            this.showNotification('Download completed successfully!', 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.isDownloading = false;
            this.hideProgress();
            this.showNotification('Download failed: ' + error.message, 'error');
        }
    },

    generateOutputFilename: function(url, quality, clipParams) {
        // Try to extract video title from the page if available
        const titleEl = document.getElementById('videoTitle');
        let baseName = 'youtube_video';
        
        if (titleEl && titleEl.textContent && titleEl.textContent !== 'Sample Video Title') {
            // Clean the title for filename
            baseName = titleEl.textContent
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 50);
        } else {
            const videoId = this.extractVideoId(url);
            baseName = videoId || 'video';
        }
        
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
        const clipSuffix = clipParams.enabled ? `_clip_${clipParams.startTime}-${clipParams.endTime}` : '';
        
        return `${baseName}${clipSuffix}_${quality}_${timestamp}.mp4`;
    },

    extractVideoId: function(url) {
        const patterns = [
            /v=([^&]+)/,
            /youtu\.be\/([^?]+)/,
            /shorts\/([^?]+)/,
            /embed\/([^?]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    },

    showProgress: function(message, percent) {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const speedInfo = document.getElementById('speedInfo');
        
        if (progressSection) progressSection.style.display = 'block';
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText) progressText.textContent = message;
        if (speedInfo) speedInfo.textContent = '';
    },

    updateProgress: function(percent, speed = null, eta = null) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const speedInfo = document.getElementById('speedInfo');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText) progressText.textContent = `Downloading... ${Math.round(percent)}%`;
        
        if (speedInfo && speed && eta) {
            speedInfo.textContent = `Speed: ${speed} | ETA: ${eta}`;
        }
    },

    hideProgress: function() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) progressSection.style.display = 'none';
    },

    showNotification: function(message, type) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Add styles if they don't exist
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 25px;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transform: translateX(120%);
                    transition: transform 0.3s ease;
                    z-index: 9999;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success {
                    border-left: 4px solid #00ff88;
                }
                .notification-success i {
                    color: #00ff88;
                }
                .notification-error {
                    border-left: 4px solid #ff0000;
                }
                .notification-error i {
                    color: #ff0000;
                }
                .notification-info {
                    border-left: 4px solid #0088ff;
                }
                .notification-info i {
                    color: #0088ff;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to body
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    cancelDownload: function() {
        this.isDownloading = false;
        this.showNotification('Download cancelled', 'info');
    },

    // Test server connection
    testConnection: async function() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/health`);
            const data = await response.json();
            console.log('Server connection test:', data);
            this.showNotification('Connected to server successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Server connection failed:', error);
            this.showNotification('Cannot connect to server. Make sure it\'s running at: ' + this.API_BASE_URL, 'error');
            return false;
        }
    }
};

// Initialize download manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DownloadManager.init();
    
    // Test server connection after 2 seconds
    setTimeout(() => {
        DownloadManager.testConnection();
    }, 2000);
});

// Make DownloadManager globally available
window.DownloadManager = DownloadManager;
