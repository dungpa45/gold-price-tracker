#!/bin/bash
cd /home/dungpham/me/gold-price-tracker
python3 scripts/get_data_vnexpress.py >> cronjob/logs/gold_price.log 2>&1