import { Zalo } from "zca-js";
import fs from "fs";
import axios from "axios";
import path from "path";
import { saveMessage } from "./db.js";

const LOG_FILE = "messages.txt";

function appendToTxt(msg, d) {
  const time = new Date().toLocaleString("vi-VN");
  const name = d.dName || d.uidFrom;
  const chatType = msg.type === 1 ? "Nhóm" : "Cá nhân";

  let content = "";

  // ===== TEXT =====
  if (typeof d.content === "string") {
    content = d.content;
  }

  // ===== OBJECT =====
  else if (typeof d.content === "object") {
    const c = d.content;

    // 📸 IMAGE
    if (d.msgType === "chat.photo") {
      content = `🖼️ IMAGE:\n${c.href}`;
    }

    // 📎 FILE
    else if (d.msgType === "share.file") {
      content = `📎 FILE: ${c.title}\n${c.href}`;
    }

    // 🔗 LINK SHARE (YouTube, web...)
    else if (d.msgType === "chat.recommended") {
      content =
        `🔗 LINK: ${c.title || ""}\n` +
        `${c.description || ""}\n` +
        `${c.href || ""}`;
    }

    // 👤 SHARE USER / CONTACT
    else if (c.action === "recommened.user") {
      content =
        `👤 USER: ${c.title || ""}\n` +
        `Zalo: ${c.href || ""}`;
    }

    // 🌐 LINK trong webchat (kiểu embed)
    else if (d.msgType === "webchat" && c.href) {
      content =
        `🔗 ${c.title || ""}\n` +
        `${c.href}`;
    }

    // 🧠 FALLBACK
    else {
      content = JSON.stringify(c, null, 2);
    }
  }

  // ===== FORMAT OUTPUT =====
  const text =
    `[${time}] ${name} → (${chatType})\n` +
    `${content}\n\n` +
    `----------------------------------------\n`;

  fs.appendFileSync(LOG_FILE, text);
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync("./config.json", "utf-8"));
  } catch {
    return {
      download: {
        enabled: true,
        privateChat: true,
        groupChat: true,
        allowGroups: [],
        allowUsers: []
      }
    };
  }
}


const SESSION_FILE = "session.json";
const DOWNLOAD_DIR = "downloads";

// 👇 thay group ID của bạn
const GROUP_ID = "YOUR_GROUP_ID";

// 👇 chỉ lấy file cần thiết
const ALLOW_EXT = ["pdf", "xlsx", "xls", "doc", "docx", "dwg"];

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

// ===== LOGIN =====
async function login() {
  const zalo = new Zalo({
    selfListen: true,
    sessionPath: "./session" // 🔥 bắt buộc
  });

  try {
    const api = await zalo.login(); // 🔥 thử login bằng session trước
    console.log("🔁 Auto login OK");
    return api;
  } catch (e) {
    console.log("📱 Chưa có session → quét QR");

    const api = await zalo.loginQR();

    console.log("✅ Đã login lần đầu");
    return api;
  }
}

function shouldDownload(msg, d, config) {
  if (!config.download.enabled) return false;

  const isGroup = msg.type === 1;
  const isPrivate = msg.type === 0;

  // bật/tắt theo loại chat
  if (isGroup && !config.download.groupChat) return false;
  if (isPrivate && !config.download.privateChat) return false;

  // lọc theo danh sách
  const allowGroups = config.download.allowGroups || [];
  const allowUsers = config.download.allowUsers || [];

  if (isGroup) {
    if (allowGroups.length > 0 && !allowGroups.includes(d.idTo)) {
      return false;
    }
  }

  if (isPrivate) {
    if (allowUsers.length > 0 && !allowUsers.includes(d.uidFrom)) {
      return false;
    }
  }

  return true;
}

// ===== PARSE CONTENT =====
function parseContent(content) {
  if (!content) return "";

  if (typeof content === "string") return content;

  if (content.href) return content.href;

  return JSON.stringify(content);
}

// ===== LẤY EXT =====
function getExt(url, file) {
  // ưu tiên lấy từ metadata
  try {
    const params = file?.payload?.params;

    if (params) {
      const json = JSON.parse(params);
      if (json.fileExt) return json.fileExt.toLowerCase();
    }
  } catch {}

  // fallback từ url
  try {
    return url.split(".").pop().split("?")[0].toLowerCase();
  } catch {
    return "";
  }
}


// ===== DOWNLOAD FILE =====
async function downloadFile(url, fileName) {
  const filePath = path.join(DOWNLOAD_DIR, fileName);

  const res = await axios({
    url,
    method: "GET",
    responseType: "stream",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://chat.zalo.me/"
    }
  });

  res.data.pipe(fs.createWriteStream(filePath));

  console.log("📥 Download:", fileName);
}

// ===== HANDLE DOWNLOAD =====

async function handleDownload(d, type) {
  const config = loadConfig();

  // 🔥 log config để debug
  console.log("⚙️ CONFIG:", config.download);

  // ❌ tắt toàn bộ
  if (!config.download.enabled) {
    console.log("⛔ Download disabled");
    return;
  }

  const isGroup = type === 1;
  const isPrivate = type === 0;

  // ❌ tắt nhóm
  if (isGroup && !config.download.groupChat) {
    console.log("⛔ Skip group");
    return;
  }

  // ❌ tắt cá nhân
  if (isPrivate && !config.download.privateChat) {
    console.log("⛔ Skip private");
    return;
  }

  // 🔥 chỉ xử lý khi có content object
  if (!d.content || typeof d.content !== "object") return;

  const senderName = d.dName || d.uidFrom || "unknown";

  function safeName(name) {
    return name.replace(/[<>:"/\\|?*]+/g, "_");
  }

  const url = d.content.href;
  if (!url) return;

  let ext = "";
  let fileName = "";

  // ===== FILE =====
  if (d.msgType === "share.file") {
    try {
      const params = JSON.parse(d.content.params || "{}");
      ext = params.fileExt || "bin";
    } catch {
      ext = "bin";
    }

    fileName = d.content.title || `${Date.now()}.${ext}`;
  }

  // ===== ẢNH =====
  else if (d.msgType === "chat.photo") {
    ext = "jpg";
    fileName = `${Date.now()}.jpg`;
  }

  else {
    return;
  }

  const finalName = `${safeName(senderName)}_${fileName}`;

  await downloadFile(url, finalName);
}


// ===== MAIN =====
async function start() {
  const api = await login();

  console.log("✅ Bot started");

  api.listener.on("message", async (msg) => {
  const d = msg.data;
  const config = loadConfig();

  const fromId = d.uidFrom;
  const fromName = d.dName || "Unknown";
  const toId = d.idTo;

  const chatType = msg.type === 1 ? "Nhóm" : "Cá nhân";
  appendToTxt(msg, d);

  console.log(
    `📨 Tin nhắn từ: ${fromId} - ${fromName} → đến: ${toId} | ${chatType}`
  );

  console.log("📩", d.msgType);

  // 🔥 check config trước khi tải
  if (shouldDownload(msg, d, config)) {
    await handleDownload(d);
  } else {
    console.log("⛔ Bỏ qua do config");
  }

  const content = parseContent(d.content);

  saveMessage({
    id: d.msgId,
    threadId: d.threadId,
    senderId: d.uidFrom,
    content,
    time: new Date().toISOString()
  });
});

  api.listener.start();
}

start();