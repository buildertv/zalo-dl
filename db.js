import Database from "better-sqlite3";

const db = new Database("messages.db");

// tạo bảng
db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  threadId TEXT,
  senderId TEXT,
  content TEXT,
  fileUrl TEXT,
  fileName TEXT,
  time TEXT
)
`).run();

export function saveMessage(data) {
  try {
    db.prepare(`
      INSERT INTO messages 
      (id, threadId, senderId, content, fileUrl, fileName, time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.threadId,
      data.senderId,
      data.content,
      data.fileUrl,
      data.fileName,
      data.time
    );
  } catch (e) {
    // tránh trùng
  }
}