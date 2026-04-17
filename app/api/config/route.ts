import { NextResponse } from "next/server";
import fs from "fs";

const CONFIG_PATH = "./config.json";

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
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

export async function GET() {
  const config = getConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const body = await req.json();

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2));

  return NextResponse.json({ success: true });
}