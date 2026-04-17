module.exports = {
  apps: [
    {
      name: "zalo-bot",
      script: "index.js",

      watch: ["index.js"],

      ignore_watch: [
        "node_modules",
        "downloads",
        "messages.txt",
        "session.json",
        "qr.png"   // 🔥 QUAN TRỌNG
      ]
    }
  ]
};