import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('chat.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user) {
      // Simple auto-registration for demo
      const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
      user = { id: info.lastInsertRowid, username, password };
    } else if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({ id: user.id, username: user.username });
  });

  // Conversations API
  app.get('/api/conversations', (req, res) => {
    const userId = req.query.userId;
    const conversations = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json(conversations);
  });

  app.post('/api/conversations', (req, res) => {
    const { userId, title } = req.body;
    const info = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(userId, title);
    res.json({ id: info.lastInsertRowid, userId, title });
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json(messages);
  });

  app.post('/api/conversations/:id/messages', (req, res) => {
    const { role, content } = req.body;
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(req.params.id, role, content);
    res.status(201).send();
  });

  app.delete('/api/conversations/:id', (req, res) => {
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
