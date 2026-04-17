"use client";

import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(setConfig);
  }, []);

  const update = (path: string, value: any) => {
    const newConfig = { ...config };
    const keys = path.split(".");

    let obj = newConfig;
    keys.slice(0, -1).forEach(k => (obj = obj[k]));
    obj[keys[keys.length - 1]] = value;

    setConfig(newConfig);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
    setSaving(false);
    alert("✅ Đã lưu config");
  };

  if (!config) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">⚙️ Cấu hình tải file Zalo</h1>

      {/* Enable */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.download.enabled}
          onChange={e => update("download.enabled", e.target.checked)}
        />
        Bật tải file
      </label>

      {/* Private */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.download.privateChat}
          onChange={e => update("download.privateChat", e.target.checked)}
        />
        Tải từ cá nhân
      </label>

      {/* Group */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.download.groupChat}
          onChange={e => update("download.groupChat", e.target.checked)}
        />
        Tải từ nhóm
      </label>

      {/* Allow Groups */}
      <div>
        <label className="block font-medium">
          ID nhóm (mỗi dòng 1 ID, để trống = all)
        </label>
        <textarea
          className="w-full border p-2 rounded"
          rows={4}
          value={config.download.allowGroups.join("\n")}
          onChange={e =>
            update(
              "download.allowGroups",
              e.target.value.split("\n").filter(Boolean)
            )
          }
        />
      </div>

      {/* Allow Users */}
      <div>
        <label className="block font-medium">
          ID user (mỗi dòng 1 ID, để trống = all)
        </label>
        <textarea
          className="w-full border p-2 rounded"
          rows={4}
          value={config.download.allowUsers.join("\n")}
          onChange={e =>
            update(
              "download.allowUsers",
              e.target.value.split("\n").filter(Boolean)
            )
          }
        />
      </div>

      <button
        onClick={save}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {saving ? "Đang lưu..." : "💾 Lưu cấu hình"}
      </button>
    </div>
  );
}