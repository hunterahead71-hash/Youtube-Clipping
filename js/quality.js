// quality.js - Quality management system
const QualityManager = {
    qualities: {
        '144p': { resolution: '256x144', bitrate: '0.1M', label: '144p', icon: 'fa-video' },
        '240p': { resolution: '426x240', bitrate: '0.3M', label: '240p', icon: 'fa-video' },
        '360p': { resolution: '640x360', bitrate: '0.5M', label: '360p', icon: 'fa-video' },
        '480p': { resolution: '854x480', bitrate: '1M', label: '480p', icon: 'fa-video' },
        '720p': { resolution: '1280x720', bitrate: '2.5M', label: '720p HD', icon: 'fa-hd' },
        '1080p': { resolution: '1920x1080', bitrate: '5M', label: '1080p Full HD', icon: 'fa-hd' },
        '1440p': { resolution: '2560x1440', bitrate: '10M', label: '1440p 2K', icon: 'fa-2k' },
        '2160p': { resolution: '3840x2160', bitrate: '20M', label: '2160p 4K', icon: 'fa-4k' }
    },

    availableQualities: ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'],

    createQualityOptions: function(containerId, selectedQuality = '1080p') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        this.availableQualities.forEach(quality => {
            const qualityData = this.qualities[quality];
            const option = document.createElement('div');
            option.className = `quality-option ${quality === selectedQuality ? 'selected' : ''}`;
            option.setAttribute('data-quality', quality);
            
            option.innerHTML = `
                <i class="fas ${qualityData.icon}"></i>
                <span>${qualityData.label}</span>
                ${quality === '2160p' ? '<span class="quality-badge">Ultra HD</span>' : ''}
                ${quality === '1440p' ? '<span class="quality-badge">2K</span>' : ''}
                ${quality === '1080p' ? '<span class="quality-badge">Full HD</span>' : ''}
            `;
            
            option.addEventListener('click', () => this.selectQuality(quality));
            container.appendChild(option);
        });
    },

    selectQuality: function(quality) {
        document.querySelectorAll('.quality-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-quality="${quality}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Trigger quality change event
        const event = new CustomEvent('qualityChanged', { detail: { quality } });
        document.dispatchEvent(event);
    },

    getSelectedQuality: function() {
        const selected = document.querySelector('.quality-option.selected');
        return selected ? selected.getAttribute('data-quality') : '1080p';
    },

    getQualityData: function(quality) {
        return this.qualities[quality] || this.qualities['1080p'];
    },

    // Advanced quality detection from video
    detectAvailableQualities: async function(videoId) {
        // This would normally fetch from YouTube's player response
        // For demo, we'll return mock data
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulate detection
                const detected = ['2160p', '1440p', '1080p', '720p', '480p', '360p'];
                this.availableQualities = detected;
                resolve(detected);
            }, 1000);
        });
    }
};

// Initialize quality selector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    QualityManager.createQualityOptions('qualityOptions');
});
