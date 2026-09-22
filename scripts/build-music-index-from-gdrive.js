/* Build / crawl public Google Drive music folder (no API key). */
const fs = require("fs");
const path = require("path");

const FOLDER_MIME = "application/vnd.google-apps.folder";
const AUDIO_RE = /\.(ogg|oga|mp3|wav|m4a|flac|opus)$/i;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function decodeDriveIvd(raw) {
  const s = raw.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  try {
    return JSON.parse(s);
  } catch (_) {
    const fixed = s.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    return JSON.parse(fixed);
  }
}

async function fetchFolderEntries(folderId) {
  const url = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  const html = await fetch(url, { headers: HEADERS }).then((r) => {
    if (!r.ok) throw new Error(`Drive folder ${folderId}: HTTP ${r.status}`);
    return r.text();
  });
  const m = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'((?:\\'|[^'])*)'/);
  if (!m) return [];
  const data = decodeDriveIvd(m[1]);
  const rows = Array.isArray(data?.[0]) ? data[0] : [];
  return rows
    .map((row) => {
      if (!Array.isArray(row) || !row[0]) return null;
      return {
        id: String(row[0]),
        name: String(row[2] || ""),
        mimeType: String(row[3] || "").replace(/\\+/g, ""),
      };
    })
    .filter(Boolean);
}

function ensureFolderChain(folders, folderPath) {
  if (!folderPath) return;
  const parts = folderPath.split("/").filter(Boolean);
  let acc = "";
  for (let i = 0; i < parts.length; i += 1) {
    const parentId = acc || null;
    acc = acc ? `${acc}/${parts[i]}` : parts[i];
    if (!folders.find((f) => f.id === acc)) {
      folders.push({ id: acc, label: parts[i], parentId });
    } else if (parentId && !folders.find((f) => f.id === acc)?.parentId) {
      const existing = folders.find((f) => f.id === acc);
      if (existing && !existing.parentId && parentId) existing.parentId = parentId;
    }
  }
}

async function walk(folderId, folderPath, folders, tracks, depth = 0) {
  if (depth > 10) return;
  const entries = await fetchFolderEntries(folderId);
  process.stdout.write(`${"  ".repeat(depth)}[${folderPath || "/"}] ${entries.length}\n`);
  for (const entry of entries) {
    const mime = entry.mimeType || "";
    const isFolder = mime.includes("google-apps.folder");
    const isAudio = mime.startsWith("audio/") || AUDIO_RE.test(entry.name);

    if (isAudio && !isFolder) {
      const rel = folderPath ? `${folderPath}/${entry.name}` : entry.name;
      ensureFolderChain(folders, folderPath || "Прочее");
      tracks.push({
        id: rel.replace(/\\/g, "/"),
        title: entry.name.replace(AUDIO_RE, ""),
        folderPath: folderPath || "Прочее",
        driveId: entry.id,
        src: `gdrive:${entry.id}`,
      });
      continue;
    }

    if (isFolder) {
      const childPath = folderPath ? `${folderPath}/${entry.name}` : entry.name;
      ensureFolderChain(folders, childPath);
      await new Promise((r) => setTimeout(r, 200));
      await walk(entry.id, childPath, folders, tracks, depth + 1);
    }
  }
}

async function buildCatalog(rootFolderId) {
  const folders = [];
  const tracks = [];
  await walk(rootFolderId, "", folders, tracks, 0);
  folders.sort((a, b) => a.id.localeCompare(b.id, "en"));
  tracks.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return {
    source: "gdrive",
    folderId: rootFolderId,
    folders,
    tracks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const root = process.argv[2] || "1xXichFk7SQH3TSD4XETlZ7ENNId1Pr1R";
  const out =
    process.argv[3] ||
    path.join(__dirname, "..", "assets", "sound", "music-index.json");
  console.log("Crawling Drive folder", root);
  const catalog = await buildCatalog(root);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(catalog, null, 2));
  console.log(
    `Wrote ${catalog.tracks.length} tracks, ${catalog.folders.length} folders -> ${out}`
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { buildCatalog, fetchFolderEntries };
