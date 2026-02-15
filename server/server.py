#!/usr/bin/env python3
"""
YouTube Pro Downloader - Backend Server
Advanced YouTube downloading with smart clipping
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp
import re
from pathlib import Path

app = Flask(__name__, static_folder='.')
CORS(app)

class YouTubeDownloader:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        print(f"Temp directory created: {self.temp_dir}")
        
    def cleanup(self):
        """Clean up temporary files"""
        try:
            shutil.rmtree(self.temp_dir)
            print(f"Cleaned up {self.temp_dir}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def extract_video_info(self, url):
        """Extract video information without downloading"""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['default', '-tv_simply'],  # This fixes the 403 error!
                },
            },
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'formats': self.get_available_formats(info)
                }
            except Exception as e:
                print(f"Extraction error: {e}")
                return {'error': str(e)}
    
    def get_available_formats(self, info):
        """Extract available quality formats"""
        formats = []
        quality_map = {
            '144': '144p',
            '240': '240p',
            '360': '360p',
            '480': '480p',
            '720': '720p',
            '1080': '1080p',
            '1440': '1440p',
            '2160': '2160p'
        }
        
        for f in info.get('formats', []):
            height = f.get('height')
            if height and str(height) in quality_map:
                formats.append({
                    'quality': quality_map[str(height)],
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext', 'mp4'),
                    'filesize': f.get('filesize', 0)
                })
        
        # Remove duplicates by quality
        unique_formats = {}
        for f in formats:
            if f['quality'] not in unique_formats:
                unique_formats[f['quality']] = f
        
        return list(unique_formats.values())
    
    def download_video(self, url, quality, clip_start=None, clip_end=None):
        """Download video with optional clipping"""
        try:
            output_template = os.path.join(self.temp_dir, '%(title)s.%(ext)s')
            
            # Quality mapping
            quality_formats = {
                '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]',
                '240p': 'bestvideo[height<=240]+bestaudio/best[height<=240]',
                '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
                '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
                '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
                '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
                '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
                '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
            }
            
            format_string = quality_formats.get(quality, 'best')
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['default', '-tv_simply'],  # This fixes the 403 error!
                    },
                },
            }
            
            # Add download sections for clipping
            if clip_start is not None and clip_end is not None:
                ydl_opts['download_sections'] = [f"*{clip_start}-{clip_end}"]
                ydl_opts['force_keyframes_at_cuts'] = True
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print(f"Downloading {url} with quality {quality}")
                info = ydl.extract_info(url, download=True)
                
                # Get the filename
                if 'requested_downloads' in info:
                    filename = info['requested_downloads'][0]['filepath']
                else:
                    filename = ydl.prepare_filename(info)
                
                # If filename doesn't exist, try to find the actual file
                if not os.path.exists(filename):
                    # Look for any file in temp_dir that was created recently
                    files = list(Path(self.temp_dir).glob('*'))
                    if files:
                        # Get the most recent file
                        filename = str(max(files, key=os.path.getctime))
                
                print(f"Downloaded to: {filename}")
                return filename
                
        except Exception as e:
            print(f"Download error: {e}")
            return {'error': str(e)}

downloader = YouTubeDownloader()

# Serve static files (your HTML, CSS, JS)
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    return send_from_directory('.', path)

@app.route('/api/info', methods=['POST'])
def get_video_info():
    """Get video information"""
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        print(f"Fetching info for: {url}")
        info = downloader.extract_video_info(url)
        return jsonify(info)
    except Exception as e:
        print(f"Error in get_video_info: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download_video():
    """Download video"""
    try:
        data = request.json
        url = data.get('url')
        quality = data.get('quality', '1080p')
        clip = data.get('clip')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        clip_start = None
        clip_end = None
        
        if clip and clip.get('enabled'):
            clip_start = clip.get('startTime')
            clip_end = clip.get('endTime')
        
        print(f"Download request - URL: {url}, Quality: {quality}, Clip: {clip_start}-{clip_end}")
        
        result = downloader.download_video(url, quality, clip_start, clip_end)
        
        if isinstance(result, dict) and 'error' in result:
            return jsonify(result), 500
        
        # Send the file
        return send_file(
            result,
            as_attachment=True,
            download_name=os.path.basename(result),
            mimetype='video/mp4'
        )
    except Exception as e:
        print(f"Error in download_video: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'YouTube Pro Downloader API is running',
        'temp_dir': downloader.temp_dir,
        'yt_dlp_version': yt_dlp.version.__version__
    })

# Cleanup on shutdown
import atexit
atexit.register(downloader.cleanup)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
