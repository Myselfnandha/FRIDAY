import logging
import json
import sqlite3
import os
from datetime import datetime

logger = logging.getLogger("alan.memory")

class AlanMemory:
    def __init__(self, db_path="alan_memory.db"):
        self.db_path = db_path
        self._init_db()
        
    def _init_db(self):
        """Initialize local SQLite for fast episodic recall"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        # Simple Key-Value store for context
        c.execute('''CREATE TABLE IF NOT EXISTS memory
                     (key TEXT PRIMARY KEY, value TEXT, timestamp TEXT)''')
        # Logs for conversation history
        c.execute('''CREATE TABLE IF NOT EXISTS logs
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, content TEXT, timestamp TEXT)''')
        conn.commit()
        conn.close()

    def save_context(self, key: str, value: dict):
        """Save structured context"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO memory (key, value, timestamp) VALUES (?, ?, ?)",
                  (key, json.dumps(value), datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
    def get_context(self, key: str) -> dict:
        """Retrieve structured context"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT value FROM memory WHERE key=?", (key,))
        row = c.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
        return {}

    def log_interaction(self, role: str, content: str):
        """Log chat/voice interaction"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("INSERT INTO logs (role, content, timestamp) VALUES (?, ?, ?)",
                  (role, content, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        
    def get_recent_history(self, limit=10):
        """Get recent conversation history"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT role, content FROM logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = c.fetchall()
        conn.close()
        # Return in chronological order
        return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

# Quick test
if __name__ == "__main__":
    mem = AlanMemory()
    mem.log_interaction("user", "Hello Alan")
    mem.log_interaction("assistant", "Hello Sir.")
    print(mem.get_recent_history())
