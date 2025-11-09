#!/usr/bin/env python3
import sqlite3
import os

def cleanup_null_changes():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data/gold_prices.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM gold_prices WHERE change_sell IS NULL OR change_purchase IS NULL')
    deleted = cursor.rowcount
    
    conn.commit()
    conn.close()
    print(f"Deleted {deleted} records with null changes")

if __name__ == "__main__":
    cleanup_null_changes()