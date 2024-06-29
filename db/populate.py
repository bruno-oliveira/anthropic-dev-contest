import sqlite3

conn = sqlite3.connect('locallens.db')
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS pois
             (id INTEGER PRIMARY KEY AUTOINCREMENT,
              lat REAL,
              lng REAL,
              description TEXT,
              enhanced_description TEXT)''')
conn.commit()
conn.close()