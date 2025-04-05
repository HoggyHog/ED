
from flask import Flask, request, jsonify, render_template, session
import sqlite3

app = Flask(__name__)
app.secret_key = 'secret'  # Needed for session

game_started = False

# ----- DATABASE SETUP -----
def init_db():
    conn = sqlite3.connect('players.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_name TEXT UNIQUE,
            email TEXT,
            mobile TEXT,
            current_round INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('registration.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()  # ✅ accept JSON input

    team_name = data.get('team_name')
    email = data.get('email')
    mobile = data.get('mobile')
    print(team_name)
    try:
        conn = sqlite3.connect('players.db')
        c = conn.cursor()
        c.execute('INSERT INTO players (team_name, email, mobile) VALUES (?, ?, ?)', (team_name, email, mobile))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Registered successfully"}), 200
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Team name already registered"}), 400

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/admin_login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('username') == 'Pradheep' and data.get('password') == '3':
        session['admin'] = True
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Unauthorized"}), 401

@app.route('/start_game', methods=['POST'])
def start_game():
    global game_started
    if session.get('admin'):
        game_started = True
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Not logged in as admin"}), 403

@app.route('/game_status', methods=['GET'])
def game_status():
    global game_started
    return jsonify({"started": game_started})

@app.route('/progress', methods=['GET'])
def progress():
    conn = sqlite3.connect('players.db')
    c = conn.cursor()
    c.execute('SELECT team_name, score FROM players')  # ✅ include score now
    data = [{"team": row[0], "score": row[1]} for row in c.fetchall()]
    conn.close()
    return jsonify(data)

@app.route('/next_round', methods=['POST'])
def next_round():
    print('next round')
    data = request.json
    team_name = data.get('team_name')
    total_score = data.get('totalScore') 
    current_round=data.get('roundNumber')
    conn = sqlite3.connect('players.db')
    c = conn.cursor()
    c.execute('UPDATE players SET current_round = ?, score = ? WHERE team_name = ?', (current_round,total_score, team_name))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})
    
@app.route('/run')
def run_game():
    return render_template('run.html')

if __name__ == '__main__':
    app.run(debug=True)


live_scores = {}  # {team_name: score}

@app.route('/push_score', methods=['POST'])
def push_score():
    print('push score')
    data = request.json
    team_name = data.get('team_name')
    score = data.get('score')
    live_scores[team_name] = score
    return jsonify({"status": "success"})


#@app.route('/progress', methods=['GET'])  # update to use live_scores now
#def progress():
#    print('prog')
#    data = [{"team": team, "score": score} for team, score in live_scores.items()]
#    return jsonify(data)
