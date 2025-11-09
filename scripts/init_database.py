#!/usr/bin/env python3
"""
Initialize SQLite database for gold price tracking
"""
import sqlite3
import os
from datetime import datetime

def init_database():
    """Create database and tables if they don't exist"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'gold_prices.db')
    
    # Create data directory if it doesn't exist
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create gold_prices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gold_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            gold_type TEXT NOT NULL,
            buy_price REAL NOT NULL,
            sell_price REAL NOT NULL,
            location TEXT DEFAULT 'Ho Chi Minh',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, gold_type, location)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_date_type 
        ON gold_prices(date, gold_type)
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"Database initialized successfully at: {db_path}")
    print("Table 'gold_prices' created with indexes")

if __name__ == "__main__":
    init_database()