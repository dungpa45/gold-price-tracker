#!/bin/bash
# Add cron job to run at 8:30 AM daily
(crontab -l 2>/dev/null; echo "30 8 * * * /home/dungpham/me/gold-price-tracker/cronjob/run_gold_price.sh") | crontab -