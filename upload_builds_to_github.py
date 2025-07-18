#!/usr/bin/env python3
"""
GitHub Build Data Uploader
Uploads Illuvium build data to GitHub for website consumption
"""

import os
import json
import requests
import base64
from datetime import datetime
from pathlib import Path
import time

class GitHubBuildUploader:
    def __init__(self, token, repo_owner="DickKingz", repo_name="Overlay"):
        self.token = token
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.api_base = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DataKingz-Build-Uploader"
        }
    
    def get_file_sha(self, path):
        """Get the SHA of an existing file"""
        try:
            response = requests.get(
                f"{self.api_base}/contents/{path}",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json()["sha"]
            return None
        except Exception as e:
            print(f"Error getting file SHA: {e}")
            return None
    
    def upload_file(self, file_path, github_path, commit_message):
        """Upload a file to GitHub"""
        try:
            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Encode content
            content_encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            
            # Get existing file SHA if it exists
            sha = self.get_file_sha(github_path)
            
            # Prepare the payload
            payload = {
                "message": commit_message,
                "content": content_encoded,
                "branch": "main"
            }
            
            if sha:
                payload["sha"] = sha
            
            # Upload the file
            response = requests.put(
                f"{self.api_base}/contents/{github_path}",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ Successfully uploaded {github_path}")
                return response.json()["content"]["download_url"]
            else:
                print(f"❌ Failed to upload {github_path}: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error uploading {github_path}: {e}")
            return None
    
    def create_builds_index(self, builds_data):
        """Create an index file with metadata about available builds"""
        index_data = {
            "last_updated": datetime.now().isoformat(),
            "total_builds": len(builds_data),
            "builds": []
        }
        
        for build in builds_data:
            index_data["builds"].append({
                "player_name": build.get("playerName", "Unknown"),
                "placement": build.get("placement", "Unknown"),
                "match_date": build.get("matchDate", "Unknown"),
                "illuvials_count": len(build.get("illuvials", [])),
                "has_bonded": any(illuvial.get("isBonded", False) for illuvial in build.get("illuvials", [])),
                "build_id": build.get("id", f"{build.get('playerName', 'unknown')}_{build.get('matchDate', 'unknown')}")
            })
        
        return index_data
    
    def upload_builds_data(self):
        """Upload all build data files to GitHub"""
        print("🚀 Starting build data upload to GitHub...")
        
        # Files to upload
        files_to_upload = [
            ("latest_illuvium_builds.json", "data/latest_builds.json", "Update latest Illuvium builds data"),
            ("illuvium_builds_gauntlet.json", "data/gauntlet_builds.json", "Update Gauntlet builds data")
        ]
        
        # Upload each file
        uploaded_urls = {}
        for local_file, github_path, commit_msg in files_to_upload:
            if os.path.exists(local_file):
                download_url = self.upload_file(local_file, github_path, commit_msg)
                if download_url:
                    uploaded_urls[github_path] = download_url
            else:
                print(f"⚠️  File not found: {local_file}")
        
        # Create and upload index file
        if os.path.exists("latest_illuvium_builds.json"):
            with open("latest_illuvium_builds.json", 'r', encoding='utf-8') as f:
                builds_data = json.load(f)
            
            index_data = self.create_builds_index(builds_data)
            
            # Save index to temporary file
            with open("builds_index.json", 'w', encoding='utf-8') as f:
                json.dump(index_data, f, indent=2)
            
            # Upload index file
            download_url = self.upload_file("builds_index.json", "data/builds_index.json", "Update builds index")
            if download_url:
                uploaded_urls["data/builds_index.json"] = download_url
            
            # Clean up temporary file
            os.remove("builds_index.json")
        
        return uploaded_urls

def main():
    # Get GitHub token from environment or prompt user
    github_token = os.getenv("GITHUB_TOKEN")
    
    if not github_token:
        print("🔑 GitHub Token not found in environment variables.")
        print("Please set GITHUB_TOKEN environment variable or enter it below:")
        github_token = input("GitHub Token: ").strip()
        
        if not github_token:
            print("❌ No GitHub token provided. Exiting.")
            return
    
    # Initialize uploader
    uploader = GitHubBuildUploader(github_token)
    
    # Upload build data
    uploaded_urls = uploader.upload_builds_data()
    
    if uploaded_urls:
        print("\n🎉 Build data upload completed!")
        print("\n📋 Available download URLs:")
        for path, url in uploaded_urls.items():
            print(f"  {path}: {url}")
        
        print("\n🌐 Your website can now fetch data from these URLs:")
        print("  - Latest builds: https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json")
        print("  - Gauntlet builds: https://raw.githubusercontent.com/DickKingz/Overlay/main/data/gauntlet_builds.json")
        print("  - Builds index: https://raw.githubusercontent.com/DickKingz/Overlay/main/data/builds_index.json")
        
        # Create a simple HTML file for easy access
        create_download_page(uploaded_urls)
    else:
        print("❌ No files were uploaded successfully.")

def create_download_page(uploaded_urls):
    """Create a simple HTML page for easy data access"""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataKingz Illuvium Builds - Data Access</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .data-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .download-btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .download-btn:hover { background: #0056b3; }
        .json-preview { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; max-height: 200px; overflow-y: auto; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 DataKingz Illuvium Builds</h1>
        <p>Latest winning builds from top Illuvium Arena Gauntlet players</p>
        <p class="timestamp">Last updated: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC") + """</p>
    </div>
    
    <div class="data-section">
        <h2>📊 Available Data Files</h2>
        <p>Click the buttons below to download the latest build data:</p>
        
        <a href="https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json" class="download-btn" download>
            📥 Download Latest Builds (JSON)
        </a>
        
        <a href="https://raw.githubusercontent.com/DickKingz/Overlay/main/data/gauntlet_builds.json" class="download-btn" download>
            📥 Download Gauntlet Builds (JSON)
        </a>
        
        <a href="https://raw.githubusercontent.com/DickKingz/Overlay/main/data/builds_index.json" class="download-btn" download>
            📥 Download Builds Index (JSON)
        </a>
    </div>
    
    <div class="data-section">
        <h2>🔗 API Endpoints</h2>
        <p>Use these URLs in your applications to fetch data programmatically:</p>
        <ul>
            <li><strong>Latest Builds:</strong> <code>https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json</code></li>
            <li><strong>Gauntlet Builds:</strong> <code>https://raw.githubusercontent.com/DickKingz/Overlay/main/data/gauntlet_builds.json</code></li>
            <li><strong>Builds Index:</strong> <code>https://raw.githubusercontent.com/DickKingz/Overlay/main/data/builds_index.json</code></li>
        </ul>
    </div>
    
    <div class="data-section">
        <h2>📋 Example Usage</h2>
        <p>Here's how to fetch the data in JavaScript:</p>
        <div class="json-preview">
<pre><code>// Fetch latest builds
fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/latest_builds.json')
  .then(response => response.json())
  .then(data => {
    console.log('Latest builds:', data);
    // Process the builds data
  });

// Fetch builds index
fetch('https://raw.githubusercontent.com/DickKingz/Overlay/main/data/builds_index.json')
  .then(response => response.json())
  .then(data => {
    console.log('Builds index:', data);
    // Show available builds metadata
  });</code></pre>
        </div>
    </div>
    
    <div class="data-section">
        <h2>📱 Integration</h2>
        <p>This data is automatically updated daily and can be integrated into:</p>
        <ul>
            <li>📊 Dashboard websites</li>
            <li>📱 Mobile applications</li>
            <li>🤖 Discord bots</li>
            <li>📈 Analytics tools</li>
            <li>🎮 Game overlays</li>
        </ul>
    </div>
    
    <footer style="text-align: center; margin-top: 40px; color: #666;">
        <p>Powered by DataKingz | <a href="https://github.com/DickKingz/Overlay">View on GitHub</a></p>
    </footer>
</body>
</html>"""
    
    with open("builds_data_access.html", 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("\n📄 Created builds_data_access.html for easy data access")

if __name__ == "__main__":
    main() 