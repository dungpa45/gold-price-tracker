import json
import datetime
from datetime import datetime
import requests
import sqlite3
import hashlib

link_gold = "https://gw.vnexpress.net/cr/?name=tygia_vangv202206"

def get_goldprice():
    """Get gold price from vnexpress API and insert into database

    Args:
        None
    """
    response = requests.get(link_gold)
    if response.status_code == requests.codes.ok:
        res = response.json()
        update = res['data']['updated_at']
        time_format = datetime.strptime(update,'%Y-%m-%dT%H:%M:%S.%f%z')
        
        data_gold = res['data']['data']['gold']
        new = data_gold['new']
        old = data_gold['old']
        formatted_data = []

        for key, value in new.items():
            old_buy = old[key]['buy']
            new_buy = value['buy']
            old_sell = old[key]['sell']
            new_sell = value['sell']
            balance_buy = round(new_buy - old_buy,2)
            balance_sell = round(new_sell - old_sell,2)
            if balance_buy > 0 or balance_sell > 0:
                balance_buy = "+"+str(balance_buy)
                balance_sell = "+"+str(balance_sell)
            if value['label'] == "Vàng nhẫn SJC 99,99  1 chỉ, 2 chỉ, 5 chỉ":
                value['label'] = "Vàng nhẫn SJC 99,99"
            if value['label'] == "Giá vàng thế giới":
                formatted_data.append([value['label'], f"{round(value['buy'])}", f"{balance_buy}$", f"{round(value['sell'])}", f"{balance_sell}$"])
            else:
                formatted_data.append([value['label'], f"{value['buy']/1000}", f"{balance_buy}K", f"{value['sell']/1000}", f"{balance_sell}K"])
        return formatted_data, time_format
    else:
        error = "StatusCode: " + str(response.status_code) +" "+ response.text
        print(error)

try:
    result = get_goldprice()
    if result:
        data_gold = result[0]
    else:
        data_gold = []
except Exception as e:
    print(f"API error: {e}")
    data_gold = []

try:
    conn = sqlite3.connect("gold_prices.db")
    cursor = conn.cursor()
    
    result = get_goldprice()
    timestamp_str = result[1] if result else None
    
    if not timestamp_str:
        print("No timestamp available")
        timestamp_str = datetime.now().strftime('%Y-%m-%d')
    date_str = timestamp_str.strftime('%Y-%m-%d')
    datetime_str = timestamp_str.strftime('%Y-%m-%d %H:%M')
    for row in data_gold:
        print(row)
        encode_str = f"{row[0]}".encode('utf-8')
        hash_type_name = hashlib.md5(encode_str).hexdigest()
        record_id = f"{date_str}_{hash_type_name}"
        print(record_id)
        try:
            cursor.execute('''
                            INSERT OR REPLACE INTO gold_prices 
                            (id, datetime, 
                            type, price_sell, 
                            price_purchase, change_sell, 
                            change_purchase)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                record_id, datetime_str,
                                row[0], float(row[3]),
                                float(row[1]), row[4],
                                row[2]
                            ))
        except Exception as e:
            print(f"Insert error for {row[0]}: {e}")
    
    conn.commit()
    print("Data inserted successfully")
    
except sqlite3.Error as e:
    print(f"Database error: {e}")
except Exception as e:
    print(f"General error: {e}")
finally:
    if 'conn' in locals():
        conn.close()