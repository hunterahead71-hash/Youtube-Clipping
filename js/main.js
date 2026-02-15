// main.js - Main application logic and global functions

// Global functions for HTML onclick events
function pasteFromClipboard() {
    navigator.clipboard.readText().then(text => {
        document.getElementById('videoUrl').value = text;
        if (DownloadManager.isYouTubeUrl(text)) {
            DownloadManager.fetchVideoInfo();
        }
    }).catch(err => {
        DownloadManager.showNotification('Failed to read from clipboard', 'error');
    });
}

function processVideo() {
    DownloadManager.startDownload();
}

function previewClip() {
    const clipParams = ClipperManager.getClipParameters();
    if (!clipParams.enabled) {
        DownloadManager.showNotification('Please enable clipping first', 'info');
        return;
    }
    
    DownloadManager.showNotification(`Previewing clip from ${ClipperManager.formatTime(clipParams.startTime)} to ${ClipperManager.formatTime(clipParams.endTime)}`, 'info');
}

// Advanced scroll logic with parallax effects
document.addEventListener('DOMContentLoaded', () => {
    // Parallax scroll effect
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const gradientBg = document.querySelector('.gradient-bg');
        const hero = document.querySelector('.hero');
        
        if (gradientBg) {
            gradientBg.style.transform = `rotate(${scrolled * 0.1}deg)`;
        }
        
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.3}px)`;
            hero.style.opacity = 1 - (scrolled * 0.002);
        }
    });

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add floating animation to cards
    const cards = document.querySelectorAll('.feature-card, .quality-option');
    cards.forEach((card, index) => {
        card.style.animation = `float ${3 + index * 0.5}s infinite ease-in-out`;
    });

    // Input validation and formatting
    const urlInput = document.getElementById('videoUrl');
    if (urlInput) {
        urlInput.addEventListener('input', function() {
            if (DownloadManager.isYouTubeUrl(this.value)) {
                this.style.borderColor = '#00ff88';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + V is handled by browser
        // Ctrl/Cmd + Enter to download
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            processVideo();
        }
        
        // Esc to cancel download
        if (e.key === 'Escape' && DownloadManager.isDownloading) {
            DownloadManager.cancelDownload();
        }
    });

    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass);
            border-radius: 10px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
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
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    DownloadManager.showNotification('An error occurred', 'error');
});

// Handle offline/online status
window.addEventListener('offline', () => {
    DownloadManager.showNotification('You are offline. Please check your connection.', 'error');
});

window.addEventListener('online', () => {
    DownloadManager.showNotification('You are back online!', 'success');
});
