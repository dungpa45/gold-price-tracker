#!/bin/bash
cd /home/dungpa/gold-price-tracker
python3 scripts/collect_data_vnexpress.py >> cronjob/logs/gold_price.log 2>&1