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
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import re

app = Flask(__name__)
CORS(app)

class YouTubeDownloader:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
    def extract_video_info(self, url):
        """Extract video information without downloading"""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
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
        
        return formats
    
    def download_video(self, url, quality, clip_start=None, clip_end=None):
        """Download video with optional clipping"""
        output_template = os.path.join(self.temp_dir, '%(title)s.%(ext)s')
        
        ydl_opts = {
            'format': self.get_format_string(quality),
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
        }
        
        # Add download sections for clipping
        if clip_start is not None and clip_end is not None:
            ydl_opts['download_sections'] = [f"*{clip_start}-{clip_end}"]
            ydl_opts['forceremuxvideo'] = True  # Avoid re-encoding
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                if clip_start is not None:
                    # Add clip info to filename
                    base, ext = os.path.splitext(filename)
                    filename = f"{base}_clip_{clip_start}_{clip_end}{ext}"
                
                return filename
        except Exception as e:
            return {'error': str(e)}
    
    def get_format_string(self, quality):
        """Convert quality to yt-dlp format string"""
        quality_map = {
            '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]',
            '240p': 'bestvideo[height<=240]+bestaudio/best[height<=240]',
            '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
            '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
            '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
            '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
            '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
            '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
        }
        return quality_map.get(quality, 'best')

downloader = YouTubeDownloader()

@app.route('/api/info', methods=['POST'])
def get_video_info():
    """Get video information"""
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    info = downloader.extract_video_info(url)
    return jsonify(info)

@app.route('/api/download', methods=['POST'])
def download_video():
    """Download video"""
    data = request.json
    url = data.get('url')
    quality = data.get('quality', '1080p')
    clip = data.get('clip')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    clip_start = None
    clip_end = None
    
    if clip:
        clip_start = clip.get('start')
        clip_end = clip.get('end')
    
    result = downloader.download_video(url, quality, clip_start, clip_end)
    
    if isinstance(result, dict) and 'error' in result:
        return jsonify(result), 500
    
    return send_file(
        result,
        as_attachment=True,
        download_name=os.path.basename(result)
    )

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'YouTube Pro Downloader API is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
