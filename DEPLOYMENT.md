# Production Deployment Guide

## Overview

This guide covers deploying the Gold Price Tracker to production environments using various hosting options.

## Prerequisites

- Python 3.6+
- Web server with Python support
- Domain name (optional)
- SSL certificate (recommended)

## Deployment Options

### Option 1: VPS/Cloud Server (Recommended)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

#### 2. Application Setup

```bash
# Clone repository
git clone <your-repo-url> /var/www/gold-price-tracker
cd /var/www/gold-price-tracker

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python scripts/init_database.py

# Collect initial data
python scripts/collect_data_vnexpress.py
```

#### 3. Production WSGI Server

Install Gunicorn for production:

```bash
pip install gunicorn
```

Create `wsgi.py`:

```python
#!/usr/bin/env python3
from web_app import app

if __name__ == "__main__":
    app.run()
```

#### 4. Systemd Service

Create `/etc/systemd/system/gold-tracker.service`:

```ini
[Unit]
Description=Gold Price Tracker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/gold-price-tracker
Environment="PATH=/var/www/gold-price-tracker/venv/bin"
ExecStart=/var/www/gold-price-tracker/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gold-tracker
sudo systemctl start gold-tracker
```

#### 5. Nginx Reverse Proxy (Optional)

Create `/etc/nginx/sites-available/gold-tracker`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/gold-price-tracker/website;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/gold-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

#### 7. Automated Data Collection

Setup cronjob for data collection:

```bash
# Edit crontab
sudo crontab -e

# Add line for hourly data collection
0 * * * * cd /var/www/gold-price-tracker && /var/www/gold-price-tracker/venv/bin/python scripts/collect_data_vnexpress.py >> /var/log/gold-tracker-cron.log 2>&1
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python scripts/init_database.py

EXPOSE 8001

CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:8001", "wsgi:app"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  gold-tracker:
    build: .
    ports:
      - "8001:8001"
    volumes:
      - ./data:/app/data
      - ./gold_prices.db:/app/gold_prices.db
    restart: unless-stopped
    environment:
      - FLASK_ENV=production

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - gold-tracker
    restart: unless-stopped
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f gold-tracker
```

### Option 3: Heroku Deployment

#### 1. Prepare for Heroku

Create `Procfile`:

```
web: gunicorn wsgi:app
```

Create `runtime.txt`:

```
python-3.9.18
```

#### 2. Deploy to Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-gold-tracker-app

# Add buildpack
heroku buildpacks:set heroku/python

# Deploy
git push heroku main

# Initialize database
heroku run python scripts/init_database.py

# Setup scheduler for data collection
heroku addons:create scheduler:standard
heroku addons:open scheduler
# Add job: python scripts/collect_data_vnexpress.py (hourly)
```

## Environment Configuration

### Production Settings

Create `.env` file:

```bash
FLASK_ENV=production
FLASK_DEBUG=False
DATABASE_URL=sqlite:///gold_prices.db
PORT=8001
```

### Security Considerations

1. **Database Security**
   - Regular backups of SQLite database
   - File permissions: `chmod 600 gold_prices.db`
   - Consider PostgreSQL for high-traffic sites

2. **Application Security**
   - Use HTTPS in production
   - Set secure headers in Flask
   - Regular security updates

3. **Server Security**
   - Firewall configuration
   - Regular system updates
   - SSH key authentication
   - Fail2ban for brute force protection

## Monitoring and Maintenance

### Log Management

```bash
# Application logs
tail -f /var/log/gold-tracker.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Systemd service logs
journalctl -u gold-tracker -f
```

### Database Maintenance

```bash
# Backup database
cp gold_prices.db gold_prices_backup_$(date +%Y%m%d).db

# Cleanup old data (optional)
python scripts/cleanup_null_changes.py
```

### Performance Monitoring

- Monitor CPU and memory usage
- Database query performance
- Response times
- Error rates

## Troubleshooting

### Common Issues

1. **Database locked errors**
   - Ensure proper connection handling
   - Check file permissions

2. **Memory issues**
   - Increase server memory
   - Optimize database queries

3. **Data collection failures**
   - Check internet connectivity
   - Verify API endpoints
   - Review error logs

### Health Checks

Create simple health check endpoint in Flask:

```python
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})
```

## Scaling Considerations

- **Database**: Migrate to PostgreSQL for better concurrency
- **Caching**: Add Redis for API response caching
- **Load Balancing**: Multiple application instances behind load balancer
- **CDN**: Static asset delivery via CDN