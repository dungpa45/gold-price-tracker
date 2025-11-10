#!/usr/bin/env python3
from flask import Flask, jsonify, request, send_from_directory
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

app = Flask(__name__)

def get_db_connection():
    db_path = Path(__file__).parent / 'gold_prices.db'
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    website_dir = Path(__file__).parent / 'website'
    return send_from_directory(website_dir, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    website_dir = Path(__file__).parent / 'website'
    return send_from_directory(website_dir, filename)

@app.route('/api/data')
def api_data():
    # Disable caching for API responses
    from flask import make_response
    
    def add_no_cache_headers(response):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Parse query parameters
        date_param = request.args.get('date')
        month_param = request.args.get('month')
        
        if date_param:
            # Single day data
            cursor.execute("""
                SELECT datetime, type, price_sell, price_purchase, change_sell, change_purchase
                FROM gold_prices 
                WHERE DATE(datetime) = ?
                ORDER BY type
            """, [date_param])
            current_prices_data = cursor.fetchall()
            chart_data = {}
            view_type = 'daily'
            
        elif month_param:
            # Monthly data
            cursor.execute("""
                SELECT datetime, type, price_sell, price_purchase, change_sell, change_purchase
                FROM gold_prices 
                WHERE strftime('%Y-%m', datetime) = ?
                ORDER BY datetime DESC, type
                LIMIT 10
            """, [month_param])
            current_prices_data = cursor.fetchall()
            
            # Get monthly chart data
            cursor.execute("""
                SELECT datetime, type, price_sell, price_purchase
                FROM gold_prices 
                WHERE strftime('%Y-%m', datetime) = ?
                ORDER BY datetime, type
            """, [month_param])
            historical_data = cursor.fetchall()
            view_type = 'monthly'
            
        else:
            # Default: latest prices + 30 days chart
            cursor.execute("""
                SELECT datetime, type, price_sell, price_purchase, change_sell, change_purchase
                FROM gold_prices 
                WHERE datetime = (SELECT MAX(datetime) FROM gold_prices)
                ORDER BY type
            """, [])
            current_prices_data = cursor.fetchall()
            
            # Get 30 days data for chart
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            cursor.execute("""
                SELECT datetime, type, price_sell, price_purchase
                FROM gold_prices 
                WHERE datetime >= ?
                ORDER BY datetime, type
            """, [thirty_days_ago])
            historical_data = cursor.fetchall()
            view_type = 'current'
        
        # Process current prices
        current_prices = []
        for row in current_prices_data:
            if isinstance(row, dict):
                current_prices.append({
                    'type': row['type'],
                    'sell': row['price_sell'],
                    'buy': row['price_purchase'],
                    'change_sell': row['change_sell'],
                    'change_buy': row['change_purchase']
                })
            else:
                current_prices.append({
                    'type': row['type'],
                    'sell': row['price_sell'],
                    'buy': row['price_purchase'],
                    'change_sell': row['change_sell'],
                    'change_buy': row['change_purchase']
                })
        
        # Process chart data (only for monthly and default views)
        chart_data = {}
        if not date_param:  # Skip chart for single day
            for row in historical_data:
                gold_type = row['type']
                if gold_type not in chart_data:
                    chart_data[gold_type] = []
                chart_data[gold_type].append({
                    'date': row['datetime'],
                    'sell': row['price_sell'],
                    'buy': row['price_purchase']
                })
        
        # Calculate statistics
        stats = {}
        for gold_type in chart_data:
            prices = [item['sell'] for item in chart_data[gold_type]]
            if prices:
                stats[gold_type] = {
                    'high': max(prices),
                    'low': min(prices),
                    'avg': sum(prices) / len(prices),
                    'volatility': max(prices) - min(prices) if len(prices) > 1 else 0
                }
        
        conn.close()
        
        # Debug logging
        print(f"Returning {len(current_prices)} current prices")
        print(f"Chart data keys: {list(chart_data.keys())}")
        
        response = make_response(jsonify({
            'last_updated': datetime.now().isoformat(),
            'current_prices': current_prices,
            'chart_data': chart_data,
            'statistics': stats,
            'view_type': view_type
        }))
        return add_no_cache_headers(response)
        
    except Exception as e:
        response = make_response(jsonify({'error': str(e)}), 500)
        return add_no_cache_headers(response)

def serve_website(port=8001):
    print(f"Starting Flask server at http://localhost:{port}")
    print(f"API endpoint: http://localhost:{port}/api/data")
    print("Press Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=port, debug=False)

if __name__ == "__main__":
    serve_website()