# Gold Price Tracker Website

A Vietnamese gold price tracking website with real-time data visualization and historical analysis.

## Features

- 📊 Real-time gold price display with auto-refresh
- 📈 Interactive historical charts (30-day trends)
- 📊 Price comparison across multiple Vietnamese locations
- 📉 Trend analysis with daily/weekly percentage changes
- 📊 Statistical analysis (high, low, average, volatility)
- 🔄 Automated data collection from VnExpress API
- 📱 Responsive design optimized for mobile devices

## Quick Start

1. **Complete setup and launch:**
   ```bash
   python setup.py
   ```

2. **Open your browser to:** http://localhost:8001

## Manual Setup

```bash
# 1. Initialize database schema
python scripts/init_database.py

# 2. Collect initial data
python scripts/collect_data_vnexpress.py

# 3. Start Flask web server
python web_app.py
```

## Data Collection

```bash
# Manual data collection
python scripts/collect_data_vnexpress.py

# Setup automated collection (cronjob)
chmod +x cronjob/setup_cron.sh
./cronjob/setup_cron.sh
```

## Project Structure

```
gold-price-tracker/
├── website/                 # Frontend static files
│   ├── index.html          # Main HTML interface
│   ├── css/style.css       # Responsive styling
│   └── js/main.js          # Chart.js integration & UI logic
├── scripts/                # Backend Python scripts
│   ├── init_database.py    # Database schema setup
│   └── collect_data_vnexpress.py  # VnExpress API scraper
├── web_app.py              # Flask web server
├── data/                   # Database storage
│   └── gold_prices.db      # SQLite database
├── cronjob/                # Automation scripts
│   ├── run_gold_price.sh   # Cronjob execution
│   └── setup_cron.sh       # Cronjob installer
├── setup.py               # Main launcher
└── wsgi.py                # WSGI entry point
```

## API Endpoints

- **GET /** - Main website interface
- **GET /api/data** - JSON data for current prices and charts
- **GET /api/data?date=YYYY-MM-DD** - Historical data for specific date
- **GET /api/data?month=YYYY-MM** - Monthly summary data

## Technology Stack

- **Backend:** Python 3.6+, Flask 2.3.3, SQLite3
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Chart.js
- **Data Source:** VnExpress Gold Price API
- **Deployment:** Flask development server or production WSGI

## Requirements

- Python 3.6+
- Flask 2.3.3 (auto-installed by setup.py)
- Modern web browser with JavaScript enabled
- Internet connection for data collection

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production setup instructions.

## Development

- **Database Management:** Use `scripts/clear_db.py` to reset database
- **Data Cleanup:** Run `scripts/cleanup_null_changes.py` for maintenance
- **Styling:** Edit `website/css/style.css` for UI customization
- **Charts:** Modify `website/js/main.js` for chart behavior

## License

MIT License - see LICENSE file for details