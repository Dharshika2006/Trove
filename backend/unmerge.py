import sqlite3
import uuid
from datetime import datetime, timezone

def unmerge():
    conn = sqlite3.connect('data/trove.db')
    cursor = conn.cursor()
    
    # Get the merged user
    cursor.execute('SELECT id, github_id FROM users WHERE email = \"dharshiof2006@gmail.com\"')
    google_user = cursor.fetchone()
    
    if google_user and google_user[1]:
        google_id_primary, github_id = google_user
        
        # 1. Remove github_id from Google user
        cursor.execute('UPDATE users SET github_id = NULL WHERE id = ?', (google_id_primary,))
        
        # 2. Recreate the GitHub user
        new_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute('''
            INSERT INTO users (id, email, name, github_id, oauth_provider, oauth_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (new_id, 'dharshi.k890@gmail.com', 'Dharshika Katta', github_id, 'legacy', 'legacy', now))
        
        print('Successfully unmerged accounts.')
    else:
        print('No github_id found on the Google account.')
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    unmerge()
