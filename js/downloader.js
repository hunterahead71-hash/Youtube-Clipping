// downloader.js - Advanced download management system
const DownloadManager = {
    currentDownload: null,
    downloadQueue: [],
    isDownloading: false,

    init: function() {
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        // Listen for paste events
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Auto-fetch video info when URL is pasted
        const urlInput = document.getElementById('videoUrl');
        if (urlInput) {
            urlInput.addEventListener('paste', (e) => {
                setTimeout(() => this.fetchVideoInfo(), 100);
            });
            urlInput.addEventListener('change', () => this.fetchVideoInfo());
        }
    },

    handlePaste: function(e) {
        const pastedText = e.clipboardData.getData('text');
        if (this.isYouTubeUrl(pastedText)) {
            document.getElementById('videoUrl').value = pastedText;
            this.fetchVideoInfo();
        }
    },

    isYouTubeUrl: function(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=/,
            /^(https?:\/\/)?(www\.)?youtu\.be\//,
            /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\//
        ];
        return patterns.some(pattern => pattern.test(url));
    },

    fetchVideoInfo: async function() {
        const url = document.getElementById('videoUrl').value;
        if (!this.isYouTubeUrl(url)) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        this.showProgress('Fetching video information...', 10);

        try {
            // Simulate API call to fetch video info
            // In production, this would call your backend
            await this.simulateVideoFetch(url);
            
            this.hideProgress();
            this.showVideoInfo({
                title: 'Sample Video Title',
                duration: 10800, // 3 hours
                thumbnail: 'https://img.youtube.com/vi/default.jpg'
            });
            
            this.showNotification('Video information loaded!', 'success');
        } catch (error) {
            this.hideProgress();
            this.showNotification('Failed to fetch video information', 'error');
        }
    },

    simulateVideoFetch: function(url) {
        return new Promise(resolve => {
            setTimeout(resolve, 2000);
        });
    },

    showVideoInfo: function(info) {
        const videoInfo = document.getElementById('videoInfo');
        document.getElementById('videoTitle').textContent = info.title;
        document.getElementById('videoDuration').textContent = `Duration: ${this.formatDuration(info.duration)}`;
        document.getElementById('thumbnail').src = info.thumbnail;
        
        videoInfo.style.display = 'flex';
        
        // Set duration in clipper
        if (typeof ClipperManager !== 'undefined') {
            ClipperManager.setVideoDuration(info.duration);
        }
    },

    formatDuration: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours} hour ${minutes} minutes`;
        }
        return `${minutes} minutes`;
    },

    startDownload: async function() {
        const url = document.getElementById('videoUrl').value;
        if (!this.isYouTubeUrl(url)) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            return;
        }

        const quality = QualityManager.getSelectedQuality();
        const clipParams = ClipperManager.getClipParameters();

        this.isDownloading = true;
        this.showProgress('Initializing download...', 0);

        try {
            // Create download command
            const downloadCommand = {
                url: url,
                quality: quality,
                clip: clipParams.enabled ? {
                    start: clipParams.startTime,
                    end: clipParams.endTime
                } : null,
                output: this.generateOutputFilename(url, quality, clipParams)
            };

            // In production, this would send to your backend
            // For demo, we'll simulate the download
            await this.simulateDownload(downloadCommand);

            this.isDownloading = false;
            this.hideProgress();
            this.showNotification('Download completed successfully!', 'success');
        } catch (error) {
            this.isDownloading = false;
            this.hideProgress();
            this.showNotification('Download failed: ' + error.message, 'error');
        }
    },

    simulateDownload: async function(command) {
        const totalSteps = 100;
        const speedInfo = document.getElementById('speedInfo');
        
        for (let step = 0; step <= totalSteps; step++) {
            if (!this.isDownloading) break;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const progress = step;
            this.updateProgress(progress);
            
            // Simulate speed info
            if (step % 10 === 0) {
                const speed = (Math.random() * 10 + 5).toFixed(2);
                const remaining = ((totalSteps - step) * 0.1).toFixed(1);
                speedInfo.textContent = `Speed: ${speed} MB/s | ETA: ${remaining}s`;
            }
        }
    },

    generateOutputFilename: function(url, quality, clipParams) {
        const videoId = this.extractVideoId(url);
        const timestamp = new Date().getTime();
        const clipSuffix = clipParams.enabled ? '_clip' : '';
        return `${videoId}_${quality}${clipSuffix}_${timestamp}.mp4`;
    },

    extractVideoId: function(url) {
        const patterns = [
            /v=([^&]+)/,
            /youtu\.be\/([^?]+)/,
            /shorts\/([^?]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return 'video';
    },

    showProgress: function(message, percent) {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressSection.style.display = 'block';
        progressFill.style.width = percent + '%';
        progressText.textContent = message;
    },

    updateProgress: function(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = percent + '%';
        progressText.textContent = `Downloading... ${percent}%`;
    },

    hideProgress: function() {
        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'none';
    },

    showNotification: function(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    cancelDownload: function() {
        this.isDownloading = false;
        this.showNotification('Download cancelled', 'info');
    }
};

// Initialize download manager
document.addEventListener('DOMContentLoaded', () => {
    DownloadManager.init();
});
