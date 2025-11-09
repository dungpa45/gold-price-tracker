import sqlite3

#Clear the database
conn = sqlite3.connect("gold_prices.db")
cursor = conn.cursor()

cursor.execute("DELETE FROM gold_prices")
conn.commit()
conn.close()
print("Database cleared successfully")