// Vercel Serverless Function — wraps Express app for /api/* routes
// Connects to Supabase PostgreSQL for persistent storage
import express from "express";
import multer from "multer";
import pg from "pg";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ---- Supabase PostgreSQL connection ----
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.xtjjavrixvnwoulgebqp:%40CByQ8i65cLD%40T3@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });

// Helper: get all nodes with metadata joined
async function getAllNodes() {
  const { rows } = await pool.query(`
    SELECT n.*, 
      m.id as meta_id, m.cover_image_url, m.cover_image_position, m.cover_image_zoom, m.artist_name, m.album_name, m.audio_url,
      m.video_url, m.video_thumbnail_url, m.link_url, m.duration, m.body_text,
      m.preview_image, m.split_screen, m.cover_emoji, m.cover_color, m.photos, m.links, m.song_ids, m.cover_images
    FROM menu_nodes n
    LEFT JOIN node_metadata m ON m.node_id = n.id
    ORDER BY n.sort_order ASC
  `);
  return rows.map(r => ({
    id: r.id,
    parentId: r.parent_id,
    type: r.type,
    title: r.title,
    sortOrder: r.sort_order,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    metadata: {
      id: r.meta_id,
      nodeId: r.id,
      coverImageUrl: r.cover_image_url,
      coverImagePosition: r.cover_image_position,
      coverImageZoom: r.cover_image_zoom,
      coverEmoji: r.cover_emoji,
      coverColor: r.cover_color,
      artistName: r.artist_name,
      albumName: r.album_name,
      audioUrl: r.audio_url,
      videoUrl: r.video_url,
      videoThumbnailUrl: r.video_thumbnail_url,
      linkUrl: r.link_url,
      duration: r.duration,
      bodyText: r.body_text,
      previewImage: r.preview_image,
      splitScreen: r.split_screen,
      photos: r.photos,
      links: r.links,
      songIds: r.song_ids,
      coverImages: r.cover_images,
    }
  }));
}

async function getNode(id) {
  const all = await getAllNodes();
  return all.find(n => n.id === id);
}

// ---- PUBLIC API (CORS-enabled) ----
app.get("/api/public/nodes", async (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-cache",
  });
  try {
    const allNodes = await getAllNodes();
    const published = allNodes
      .filter(n => n.status === "published")
      .map(n => ({
        id: n.id,
        parentId: n.parentId,
        type: n.type,
        title: n.title,
        sortOrder: n.sortOrder,
        metadata: n.metadata ? {
          coverImage: n.metadata.coverImageUrl || undefined,
          coverImageUrl: n.metadata.coverImageUrl || undefined,
          coverImagePosition: n.metadata.coverImagePosition || undefined,
          coverImageZoom: n.metadata.coverImageZoom || undefined,
          coverEmoji: n.metadata.coverEmoji || undefined,
          coverColor: n.metadata.coverColor || undefined,
          artistName: n.metadata.artistName || undefined,
          albumName: n.metadata.albumName || undefined,
          audioUrl: n.metadata.audioUrl || undefined,
          videoUrl: n.metadata.videoUrl || undefined,
          thumbnailUrl: n.metadata.videoThumbnailUrl || undefined,
          videoThumbnailUrl: n.metadata.videoThumbnailUrl || undefined,
          linkUrl: n.metadata.linkUrl || undefined,
          url: n.metadata.linkUrl || undefined,
          duration: n.metadata.duration || undefined,
          bodyText: n.metadata.bodyText || undefined,
          previewImage: n.metadata.previewImage || undefined,
          splitScreen: n.metadata.splitScreen ?? undefined,
          photos: n.metadata.photos || undefined,
          links: n.metadata.links || undefined,
          songIds: n.metadata.songIds || undefined,
          coverImages: n.metadata.coverImages || undefined,
        } : {},
      }));
    res.json(published);
  } catch (err) {
    console.error("[public/nodes] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.options("/api/public/nodes", (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.sendStatus(204);
});

// ---- PREVIEW API (CORS-enabled, all nodes including drafts) ----
app.get("/api/preview/nodes", async (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-cache",
  });
  try {
    const allNodes = await getAllNodes();
    res.json(allNodes.map(n => ({
      id: n.id,
      parentId: n.parentId,
      type: n.type,
      title: n.title,
      sortOrder: n.sortOrder,
      metadata: n.metadata ? {
        coverImage: n.metadata.coverImageUrl || undefined,
        coverImageUrl: n.metadata.coverImageUrl || undefined,
        coverEmoji: n.metadata.coverEmoji || undefined,
        coverColor: n.metadata.coverColor || undefined,
        artistName: n.metadata.artistName || undefined,
        albumName: n.metadata.albumName || undefined,
        audioUrl: n.metadata.audioUrl || undefined,
        videoUrl: n.metadata.videoUrl || undefined,
        thumbnailUrl: n.metadata.videoThumbnailUrl || undefined,
        videoThumbnailUrl: n.metadata.videoThumbnailUrl || undefined,
        linkUrl: n.metadata.linkUrl || undefined,
        url: n.metadata.linkUrl || undefined,
        duration: n.metadata.duration || undefined,
        bodyText: n.metadata.bodyText || undefined,
        previewImage: n.metadata.previewImage || undefined,
        splitScreen: n.metadata.splitScreen ?? undefined,
        photos: n.metadata.photos || undefined,
        links: n.metadata.links || undefined,
        songIds: n.metadata.songIds || undefined,
        coverImages: n.metadata.coverImages || undefined,
      } : {},
    })));
  } catch (err) {
    console.error("[preview/nodes] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.options("/api/preview/nodes", (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.sendStatus(204);
});

// ---- ADMIN API ----
app.get("/api/nodes", async (_req, res) => {
  try {
    res.json(await getAllNodes());
  } catch (err) {
    console.error("[nodes] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/nodes/:id", async (req, res) => {
  try {
    const n = await getNode(req.params.id);
    n ? res.json(n) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/nodes/:id/children", async (req, res) => {
  try {
    const parentId = req.params.id === "root" ? null : req.params.id;
    const all = await getAllNodes();
    const children = all.filter(n => n.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/nodes", async (req, res) => {
  try {
    const { metadata = {}, ...data } = req.body;
    const { rows: [node] } = await pool.query(
      `INSERT INTO menu_nodes (parent_id, type, title, sort_order, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.parentId || null, data.type, data.title, data.sortOrder ?? 0, data.status || "draft"]
    );
    await pool.query(
      `INSERT INTO node_metadata (node_id, cover_image_url, artist_name, album_name, audio_url, video_url, video_thumbnail_url, link_url, duration, body_text, preview_image, photos, links, song_ids, cover_images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [node.id, metadata.coverImageUrl||null, metadata.artistName||null, metadata.albumName||null, metadata.audioUrl||null, metadata.videoUrl||null, metadata.videoThumbnailUrl||null, metadata.linkUrl||null, metadata.duration||null, metadata.bodyText||null, metadata.previewImage||null, metadata.photos ? JSON.stringify(metadata.photos) : null, metadata.links ? JSON.stringify(metadata.links) : null, metadata.songIds ? JSON.stringify(metadata.songIds) : null, metadata.coverImages ? JSON.stringify(metadata.coverImages) : null]
    );
    const created = await getNode(node.id);
    res.status(201).json(created);
  } catch (err) {
    console.error("[create] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch("/api/nodes/:id", async (req, res) => {
  try {
    const { metadata, ...data } = req.body;
    const sets = [];
    const vals = [];
    let idx = 1;
    if (data.title !== undefined) { sets.push(`title = $${idx++}`); vals.push(data.title); }
    if (data.parentId !== undefined) { sets.push(`parent_id = $${idx++}`); vals.push(data.parentId); }
    if (data.type !== undefined) { sets.push(`type = $${idx++}`); vals.push(data.type); }
    if (data.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(data.sortOrder); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(data.status); }
    sets.push(`updated_at = NOW()`);
    if (sets.length > 1 || data.status !== undefined) {
      vals.push(req.params.id);
      await pool.query(`UPDATE menu_nodes SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
    }
    if (metadata) {
      const mSets = [];
      const mVals = [];
      let mi = 1;
      for (const [key, val] of Object.entries(metadata)) {
        const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (["photos", "links", "song_ids", "cover_images"].includes(col)) {
          mSets.push(`${col} = $${mi++}`);
          mVals.push(val ? JSON.stringify(val) : null);
        } else {
          mSets.push(`${col} = $${mi++}`);
          mVals.push(val ?? null);
        }
      }
      if (mSets.length > 0) {
        mVals.push(req.params.id);
        await pool.query(`UPDATE node_metadata SET ${mSets.join(", ")} WHERE node_id = $${mi}`, mVals);
      }
    }
    const updated = await getNode(req.params.id);
    if (!updated) return res.status(404).json({ message: "Not found" });
    if (data.status) {
      await syncTranscriptStatus(updated, data.status);
    }
    res.json(updated);
  } catch (err) {
    console.error("[update] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/nodes/:id", async (req, res) => {
  try {
    // Recursively find and delete children
    async function deleteRecursive(id) {
      const { rows: children } = await pool.query(`SELECT id FROM menu_nodes WHERE parent_id = $1`, [id]);
      for (const child of children) await deleteRecursive(child.id);
      await pool.query(`DELETE FROM node_metadata WHERE node_id = $1`, [id]);
      await pool.query(`DELETE FROM menu_nodes WHERE id = $1`, [id]);
    }
    await deleteRecursive(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("[delete] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/nodes/:id/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query(`UPDATE menu_nodes SET sort_order = $1, updated_at = NOW() WHERE id = $2`, [i, orderedIds[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/nodes/:id/move", async (req, res) => {
  try {
    const { newParentId, sortOrder } = req.body;
    const parentVal = newParentId || null;
    await pool.query(
      `UPDATE menu_nodes SET parent_id = $1, sort_order = $2, updated_at = NOW() WHERE id = $3`,
      [parentVal, sortOrder ?? 0, req.params.id]
    );
    const updated = await getNode(req.params.id);
    updated ? res.json(updated) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    console.error("[move] Error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Helper: sync transcript text node status when a song's status changes
async function syncTranscriptStatus(songNode, newStatus) {
  const FOLDER_TITLE = "i prefer to read 🤓";
  if (songNode.type !== "song" || !songNode.parentId) return;
  const { rows: siblings } = await pool.query(
    `SELECT id, type, title FROM menu_nodes WHERE parent_id = $1`,
    [songNode.parentId]
  );
  const readFolder = siblings.find(s => s.type === "folder" && s.title === FOLDER_TITLE);
  if (!readFolder) return;
  const { rows: folderChildren } = await pool.query(
    `SELECT id, type, title FROM menu_nodes WHERE parent_id = $1`,
    [readFolder.id]
  );
  const matchingText = folderChildren.find(c => c.type === "text" && c.title === songNode.title);
  if (matchingText) {
    await pool.query(`UPDATE menu_nodes SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, matchingText.id]);
  }
}

app.post("/api/nodes/:id/publish", async (req, res) => {
  try {
    await pool.query(`UPDATE menu_nodes SET status = 'published', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    const n = await getNode(req.params.id);
    if (!n) return res.status(404).json({ message: "Not found" });
    await syncTranscriptStatus(n, "published");
    res.json(n);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/nodes/:id/unpublish", async (req, res) => {
  try {
    await pool.query(`UPDATE menu_nodes SET status = 'draft', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    const n = await getNode(req.params.id);
    if (!n) return res.status(404).json({ message: "Not found" });
    await syncTranscriptStatus(n, "draft");
    res.json(n);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/upload/audio", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });
app.post("/api/upload/image", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });
app.post("/api/upload/video", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });

export default app;
