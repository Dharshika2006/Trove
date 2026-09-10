import sqlite3

def migrate():
    conn = sqlite3.connect('data/trove.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN google_id VARCHAR(255)')
        cursor.execute('ALTER TABLE users ADD COLUMN github_id VARCHAR(255)')
    except sqlite3.OperationalError as e:
        print(f'Columns might already exist: {e}')
        
    cursor.execute('UPDATE users SET google_id = oauth_id WHERE oauth_provider = \"google\"')
    cursor.execute('UPDATE users SET github_id = oauth_id WHERE oauth_provider = \"github\"')
    
    cursor.execute('SELECT id, github_id FROM users WHERE email = \"dharshi.k890@gmail.com\"')
    github_user = cursor.fetchone()
    
    cursor.execute('SELECT id FROM users WHERE email = \"dharshiof2006@gmail.com\"')
    google_user = cursor.fetchone()
    
    if github_user and google_user:
        github_user_id, github_id = github_user
        google_user_id = google_user[0]
        
        cursor.execute('UPDATE users SET github_id = ? WHERE id = ?', (github_id, google_user_id))
        cursor.execute('UPDATE researches SET user_id = ? WHERE user_id = ?', (google_user_id, github_user_id))
        cursor.execute('UPDATE documents SET user_id = ? WHERE user_id = ?', (google_user_id, github_user_id))
        cursor.execute('DELETE FROM users WHERE id = ?', (github_user_id,))
        print('Successfully merged GitHub account into Google account.')
    
    conn.commit()
    conn.close()
    print('Migration complete.')

if __name__ == '__main__':
    migrate()
