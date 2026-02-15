#!/usr/bin/env python3
"""
YouTube Pro Downloader - Advanced Download Script
Supports smart clipping without downloading entire video
"""

import argparse
import subprocess
import sys
import os
import re
from pathlib import Path

class AdvancedYouTubeDownloader:
    def __init__(self):
        self.check_dependencies()
    
    def check_dependencies(self):
        """Check if yt-dlp is installed"""
        try:
            subprocess.run(['yt-dlp', '--version'], 
                         capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("yt-dlp is not installed. Installing...")
            self.install_dependencies()
    
    def install_dependencies(self):
        """Install required dependencies"""
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', 
                          'yt-dlp', '--upgrade'], check=True)
            print("yt-dlp installed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {e}")
            sys.exit(1)
    
    def parse_time(self, time_str):
        """Parse time string to seconds"""
        parts = list(map(int, time_str.split(':')))
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 1:
            return parts[0]
        return 0
    
    def download(self, url, quality='1080p', clip_start=None, clip_end=None):
        """Download video with smart clipping"""
        
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
        
        # Build command
        cmd = ['yt-dlp']
        
        # Add format
        cmd.extend(['-f', format_string])
        
        # Add download sections for clipping
        if clip_start and clip_end:
            start_sec = self.parse_time(clip_start)
            end_sec = self.parse_time(clip_end)
            cmd.extend(['--download-sections', f'*{start_sec}-{end_sec}'])
            cmd.extend(['--force-keyframes-at-cuts'])
        
        # Output template
        output_dir = Path.home() / 'Downloads' / 'YouTube Pro'
        output_dir.mkdir(exist_ok=True)
        
        if clip_start and clip_end:
            output_template = str(output_dir / '%(title)s_clip_%(epoch)s.%(ext)s')
        else:
            output_template = str(output_dir / '%(title)s.%(ext)s')
        
        cmd.extend(['-o', output_template])
        
        # Add URL
        cmd.append(url)
        
        print(f"\n{'='*60}")
        print(f"Starting download with quality: {quality}")
        if clip_start and clip_end:
            print(f"Clipping from {clip_start} to {clip_end}")
        print(f"{'='*60}\n")
        
        # Execute download
        try:
            subprocess.run(cmd, check=True)
            print(f"\n✅ Download completed successfully!")
            print(f"📁 Saved to: {output_dir}")
        except subprocess.CalledProcessError as e:
            print(f"\n❌ Download failed: {e}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Advanced YouTube Downloader with Smart Clipping')
    parser.add_argument('url', help='YouTube video URL')
    parser.add_argument('-q', '--quality', default='1080p',
                       choices=['144p', '240p', '360p', '480p', 
                               '720p', '1080p', '1440p', '2160p'],
                       help='Video quality')
    parser.add_argument('-s', '--start', help='Clip start time (HH:MM:SS or MM:SS)')
    parser.add_argument('-e', '--end', help='Clip end time (HH:MM:SS or MM:SS)')
    
    args = parser.parse_args()
    
    downloader = AdvancedYouTubeDownloader()
    downloader.download(args.url, args.quality, args.start, args.end)

if __name__ == '__main__':
    main()
