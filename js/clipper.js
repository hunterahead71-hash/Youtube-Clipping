// clipper.js - Advanced video clipping system
const ClipperManager = {
    videoDuration: 0,
    startTime: 0,
    endTime: 0,
    isDragging: false,
    dragHandle: null,

    init: function() {
        this.setupEventListeners();
        this.setupTimelineInteractions();
    },

    setupEventListeners: function() {
        const enableClipping = document.getElementById('enableClipping');
        if (enableClipping) {
            enableClipping.addEventListener('change', (e) => {
                const clipControls = document.getElementById('clipControls');
                clipControls.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');

        if (startTimeInput) {
            startTimeInput.addEventListener('input', (e) => this.handleTimeInput('start', e.target.value));
            startTimeInput.addEventListener('blur', (e) => this.validateTimeInput('start'));
        }

        if (endTimeInput) {
            endTimeInput.addEventListener('input', (e) => this.handleTimeInput('end', e.target.value));
            endTimeInput.addEventListener('blur', (e) => this.validateTimeInput('end'));
        }
    },

    setupTimelineInteractions: function() {
        const startHandle = document.getElementById('startHandle');
        const endHandle = document.getElementById('endHandle');
        const timelineRange = document.getElementById('timelineRange');
        const timelineSlider = document.querySelector('.timeline-slider');

        if (!startHandle || !endHandle || !timelineRange) return;

        const updateTimelineFromHandles = () => {
            const sliderRect = timelineSlider.getBoundingClientRect();
            const startPercent = (parseFloat(startHandle.style.left) / sliderRect.width) * 100;
            const endPercent = (parseFloat(endHandle.style.left) / sliderRect.width) * 100;
            
            timelineRange.style.left = `${startPercent}%`;
            timelineRange.style.width = `${endPercent - startPercent}%`;
            
            this.startTime = (startPercent / 100) * this.videoDuration;
            this.endTime = (endPercent / 100) * this.videoDuration;
            
            document.getElementById('startPreview').textContent = this.formatTime(this.startTime);
            document.getElementById('endPreview').textContent = this.formatTime(this.endTime);
            document.getElementById('startTime').value = this.formatTime(this.startTime);
            document.getElementById('endTime').value = this.formatTime(this.endTime);
        };

        const startDrag = (e, handle) => {
            this.isDragging = true;
            this.dragHandle = handle;
            handle.style.cursor = 'grabbing';
        };

        const onDrag = (e) => {
            if (!this.isDragging || !this.dragHandle) return;

            const sliderRect = timelineSlider.getBoundingClientRect();
            let x = e.clientX - sliderRect.left;
            x = Math.max(0, Math.min(x, sliderRect.width));
            
            const percent = (x / sliderRect.width) * 100;
            
            if (this.dragHandle === startHandle) {
                const endPercent = parseFloat(endHandle.style.left) || 100;
                if (percent < endPercent - 2) {
                    startHandle.style.left = `${percent}%`;
                }
            } else if (this.dragHandle === endHandle) {
                const startPercent = parseFloat(startHandle.style.left) || 0;
                if (percent > startPercent + 2) {
                    endHandle.style.left = `${percent}%`;
                }
            }
            
            updateTimelineFromHandles();
        };

        const stopDrag = () => {
            this.isDragging = false;
            if (this.dragHandle) {
                this.dragHandle.style.cursor = 'grab';
                this.dragHandle = null;
            }
        };

        startHandle.addEventListener('mousedown', (e) => startDrag(e, startHandle));
        endHandle.addEventListener('mousedown', (e) => startDrag(e, endHandle));
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    },

    setVideoDuration: function(duration) {
        this.videoDuration = duration;
        this.endTime = duration;
        
        document.getElementById('endTime').value = this.formatTime(duration);
        document.getElementById('endPreview').textContent = this.formatTime(duration);
        
        // Reset handles
        const startHandle = document.getElementById('startHandle');
        const endHandle = document.getElementById('endHandle');
        const timelineRange = document.getElementById('timelineRange');
        
        if (startHandle && endHandle && timelineRange) {
            startHandle.style.left = '0%';
            endHandle.style.left = '100%';
            timelineRange.style.left = '0%';
            timelineRange.style.width = '100%';
        }
    },

    handleTimeInput: function(type, value) {
        // Real-time validation while typing
        const time = this.parseTimeInput(value);
        if (!isNaN(time)) {
            if (type === 'start' && time < this.endTime) {
                this.startTime = time;
                this.updateTimelinePosition('start', time);
            } else if (type === 'end' && time > this.startTime) {
                this.endTime = time;
                this.updateTimelinePosition('end', time);
            }
        }
    },

    validateTimeInput: function(type) {
        const input = document.getElementById(`${type}Time`);
        const value = input.value;
        let time = this.parseTimeInput(value);
        
        if (isNaN(time)) {
            time = type === 'start' ? this.startTime : this.endTime;
        } else {
            if (type === 'start') {
                time = Math.max(0, Math.min(time, this.endTime - 1));
                this.startTime = time;
            } else {
                time = Math.min(this.videoDuration, Math.max(time, this.startTime + 1));
                this.endTime = time;
            }
        }
        
        input.value = this.formatTime(time);
        this.updateTimelinePosition(type, time);
    },

    updateTimelinePosition: function(type, time) {
        const percent = (time / this.videoDuration) * 100;
        const handle = document.getElementById(`${type}Handle`);
        const timelineRange = document.getElementById('timelineRange');
        const otherHandle = document.getElementById(type === 'start' ? 'endHandle' : 'startHandle');
        
        if (handle) {
            handle.style.left = `${percent}%`;
        }
        
        if (timelineRange && otherHandle) {
            const startPercent = type === 'start' ? percent : parseFloat(otherHandle.style.left);
            const endPercent = type === 'end' ? percent : parseFloat(otherHandle.style.left);
            
            if (startPercent < endPercent) {
                timelineRange.style.left = `${startPercent}%`;
                timelineRange.style.width = `${endPercent - startPercent}%`;
            }
        }
        
        document.getElementById(`${type}Preview`).textContent = this.formatTime(time);
    },

    parseTimeInput: function(input) {
        // Parse HH:MM:SS or MM:SS format
        const parts = input.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1 && !isNaN(parts[0])) {
            return parts[0];
        }
        return NaN;
    },

    formatTime: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    },

    getClipParameters: function() {
        const enableClipping = document.getElementById('enableClipping').checked;
        
        if (!enableClipping) {
            return { enabled: false };
        }
        
        return {
            enabled: true,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime - this.startTime
        };
    },

    // Smart clipping algorithm
    generateClipCommand: function(videoUrl, quality, clipParams) {
        // This will be sent to the server for efficient downloading
        // The server will use youtube-dl/yt-dlp with --download-sections
        const command = {
            url: videoUrl,
            quality: quality,
            clip: clipParams.enabled ? {
                start: this.formatTimeForCommand(clipParams.startTime),
                end: this.formatTimeForCommand(clipParams.endTime)
            } : null
        };
        
        return command;
    },

    formatTimeForCommand: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

// Initialize clipper
document.addEventListener('DOMContentLoaded', () => {
    ClipperManager.init();
});
