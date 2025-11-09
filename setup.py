#!/usr/bin/env python3
import os
import subprocess
import sys

def run_setup():
    """Run complete setup for gold price tracker"""
    print("🚀 Setting up Gold Price Tracker...")
    
    # Check if database exists
    if not os.path.exists('gold_prices.db'):
        print("❌ Database not found: gold_prices.db")
        print("Please ensure your database file is in the project root directory")
        return False
    
    print("✅ Database found")
    
    # Install Flask if needed
    try:
        import flask
        print("✅ Flask is available")
    except ImportError:
        print("📎 Installing Flask...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'flask'], check=True)
        print("✅ Flask installed")
    
    print("📊 Database ready - Flask server will read directly from DB")
    
    # Start web server
    print("🌐 Starting web server...")
    print("📍 Open your browser to: http://localhost:8001")
    print("🔄 Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([sys.executable, 'web_app.py'])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    
    return True

if __name__ == '__main__':
    run_setup()