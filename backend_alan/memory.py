import logging
import json
import sqlite3
import os
from datetime import datetime

logger = logging.getLogger("alan.memory")

class AlanMemory:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(os.path.expanduser("~"), "alan_memory.db")
        self.db_path = db_path
        self._init_db()
        
    def _init_db(self):
        """Initialize local SQLite for fast episodic recall"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # 1. Short-Term / Context (Key-Value)
        c.execute('''CREATE TABLE IF NOT EXISTS working_memory
                     (key TEXT PRIMARY KEY, value TEXT, timestamp TEXT)''')
                     
        # 2. Episodic / Logs (Chronological)
        c.execute('''CREATE TABLE IF NOT EXISTS episodic_memory
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, content TEXT, timestamp TEXT)''')

        # 3. Long-Term / Semantic (Facts/Prefs)
        c.execute('''CREATE TABLE IF NOT EXISTS long_term_memory
                     (category TEXT, item TEXT, value TEXT, timestamp TEXT, 
                      PRIMARY KEY  (category, item))''')

        # 4. Personality Config
        c.execute('''CREATE TABLE IF NOT EXISTS personality
                     (trait TEXT PRIMARY KEY, current_value TEXT)''')
                     
        # Seed Default Personality if empty
        c.execute("SELECT count(*) FROM personality")
        if c.fetchone()[0] == 0:
            defaults = [
                ("verbosity", "concise"), 
                ("humor", "low"), 
                ("strictness", "high"),
                ("autonomy", "2") # Level 2: Suggest Actions
            ]
            c.executemany("INSERT INTO personality VALUES (?, ?)", defaults)

        conn.commit()
        conn.close()

    # --- Short Term ---
    def save_context(self, key: str, value: dict):
        self._upsert("working_memory", {"key": key, "value": json.dumps(value), "timestamp": datetime.now().isoformat()})
        
    def get_context(self, key: str) -> dict:
        row = self._query_one("SELECT value FROM working_memory WHERE key=?", (key,))
        return json.loads(row[0]) if row else {}

    # --- Episodic ---
    def log_interaction(self, role: str, content: str):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("INSERT INTO episodic_memory (role, content, timestamp) VALUES (?, ?, ?)",
                  (role, content, datetime.now().isoformat()))
        conn.commit()
        conn.close()

    def get_recent_history(self, limit=10):
        # Return last N interactions
        rows = self._query_all("SELECT role, content FROM episodic_memory ORDER BY id DESC LIMIT ?", (limit,))
        return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

    # --- Long Term / Personality ---
    def save_long_term(self, category: str, item: str, value: str):
        self._upsert("long_term_memory", {
            "category": category, "item": item, 
            "value": value, "timestamp": datetime.now().isoformat()
        })

    def get_long_term(self, category: str) -> dict:
        rows = self._query_all("SELECT item, value FROM long_term_memory WHERE category=?", (category,))
        return {r[0]: r[1] for r in rows}

    def get_personality(self) -> dict:
        rows = self._query_all("SELECT trait, current_value FROM personality")
        return {r[0]: r[1] for r in rows}

    # --- Helpers ---
    def _upsert(self, table, data):
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?'] * len(data))
        values = list(data.values())
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(f"INSERT OR REPLACE INTO {table} ({columns}) VALUES ({placeholders})", values)
        conn.commit()
        conn.close()

    def _query_one(self, sql, params=()):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(sql, params)
        res = c.fetchone()
        conn.close()
        return res

    def _query_all(self, sql, params=()):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(sql, params)
        res = c.fetchall()
        conn.close()
        return res

if __name__ == "__main__":
    mem = AlanMemory()
    mem.log_interaction("user", "Hello Alan")
    print(mem.get_recent_history())
    print("Personality:", mem.get_personality())
