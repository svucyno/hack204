const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dataDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'les.sqlite')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)

function migrate() {
  const cols = db.prepare(`PRAGMA table_info(users)`).all()
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('learning_path')) {
    db.exec(`ALTER TABLE users ADD COLUMN learning_path TEXT DEFAULT 'standard'`)
  }
  if (!names.has('experience_stage')) {
    db.exec(
      `ALTER TABLE users ADD COLUMN experience_stage TEXT DEFAULT 'intermediate'`,
    )
    try {
      db.exec(
        `UPDATE users SET experience_stage = 'fresher' WHERE learning_path = 'basic'`,
      )
      db.exec(
        `UPDATE users SET experience_stage = 'intermediate' WHERE experience_stage IS NULL OR TRIM(experience_stage) = ''`,
      )
    } catch {
      /* ignore */
    }
  }
  if (!names.has('learning_state_json')) {
    db.exec(
      `ALTER TABLE users ADD COLUMN learning_state_json TEXT`,
    )
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    resume_text TEXT,
    skills_json TEXT,
    client_goal TEXT,
    roadmap_template_id TEXT,
    core_stack TEXT,
    primary_focus TEXT,
    claimed_seniority TEXT,
    daily_bandwidth INTEGER DEFAULT 4,
    onboarding_complete INTEGER DEFAULT 0,
    learning_path TEXT DEFAULT 'standard',
    learning_state_json TEXT,
    created_at TEXT NOT NULL
  );
`)

migrate()

const insertUser = db.prepare(`
  INSERT INTO users (email, password_hash, name, created_at)
  VALUES (@email, @password_hash, @name, @created_at)
`)

const byEmail = db.prepare(`SELECT * FROM users WHERE email = ?`)
const byId = db.prepare(`SELECT * FROM users WHERE id = ?`)

const updateOnboarding = db.prepare(`
  UPDATE users SET
    resume_text = @resume_text,
    skills_json = @skills_json,
    client_goal = @client_goal,
    roadmap_template_id = @roadmap_template_id,
    core_stack = @core_stack,
    primary_focus = @primary_focus,
    claimed_seniority = @claimed_seniority,
    daily_bandwidth = @daily_bandwidth,
    learning_path = @learning_path,
    experience_stage = @experience_stage,
    onboarding_complete = @onboarding_complete
  WHERE id = @id
`)

const updateLearningState = db.prepare(`
  UPDATE users SET learning_state_json = ? WHERE id = ?
`)

module.exports = {
  db,
  insertUser,
  byEmail,
  byId,
  updateOnboarding,
  updateLearningState,
}
