from flask import Flask, render_template, request, jsonify
from llm_integration import process_input, answer_query
import sqlite3

from utils import haversine

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('db/locallens.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_poi', methods=['POST'])
def add_poi():
    data = request.json
    enhanced_data = process_input(data)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO pois (lat, lng, description, enhanced_description) VALUES (?, ?, ?, ?)',
                (enhanced_data['lat'], enhanced_data['lng'], enhanced_data['description'], enhanced_data['enhanced_description']))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/get_pois')
def get_pois():
    conn = get_db_connection()
    pois = conn.execute('SELECT * FROM pois').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in pois])

@app.route('/search', methods=['POST'])
def search():
    conn = get_db_connection()
    pois = conn.execute('SELECT * FROM pois').fetchall()
    conn.close()
    pois_json = [dict(ix) for ix in pois]
    print(pois_json)

    query = request.json['query']
    lat = request.json['lat']
    lng = request.json['lng']
    radius = request.json['radius']

    context = []
    for e in pois_json:
        dist = haversine(lat, lng, e['lat'], e['lng'])
        if dist <= radius:
            context.append(e['enhanced_description'])


    result = answer_query(query, ";".join(context))
    return jsonify({"result": result})

if __name__ == '__main__':
    app.run(debug=True)