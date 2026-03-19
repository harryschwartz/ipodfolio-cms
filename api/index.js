// Vercel Serverless Function — wraps Express app for /api/* routes
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ---- In-memory storage (persists within a single invocation / warm instance) ----
class MemStorage {
  constructor() {
    this.nodes = new Map();
    this.metadata = new Map();
    this.seedData();
  }

  seedData() {
    const seedNodes = [
      { id: "cover-flow", parentId: null, type: "cover_flow_home", title: "Cover Flow", sortOrder: 0, status: "published", metadata: {} },
      { id: "projects", parentId: null, type: "folder", title: "Projects", sortOrder: 1, status: "published", metadata: { previewImage: "img/projects-preview.jpg" } },
      { id: "project-1", parentId: "projects", type: "album", title: "Fusion 360 Headphones", sortOrder: 0, status: "published", metadata: { coverImageUrl: "img/headphones-cover.jpg", artistName: "Harry Schwartz" } },
      { id: "p1-audio", parentId: "project-1", type: "folder", title: "Audio", sortOrder: 0, status: "published", metadata: {} },
      { id: "p1-why", parentId: "p1-audio", type: "song", title: "Why", sortOrder: 0, status: "published", metadata: { artistName: "Harry Schwartz", albumName: "Fusion 360 Headphones", duration: 120, audioUrl: "" } },
      { id: "p1-journey", parentId: "p1-audio", type: "song", title: "Creative Journey", sortOrder: 1, status: "published", metadata: { artistName: "Harry Schwartz", albumName: "Fusion 360 Headphones", duration: 180, audioUrl: "" } },
      { id: "p1-learnings", parentId: "p1-audio", type: "song", title: "Learnings", sortOrder: 2, status: "published", metadata: { artistName: "Harry Schwartz", albumName: "Fusion 360 Headphones", duration: 150, audioUrl: "" } },
      { id: "p1-photos", parentId: "project-1", type: "photo_album", title: "Photos", sortOrder: 1, status: "published", metadata: { photos: [{ url: "img/placeholder-1.jpg", caption: "Design sketch", sortOrder: 0 }, { url: "img/placeholder-2.jpg", caption: "3D model", sortOrder: 1 }, { url: "img/placeholder-3.jpg", caption: "Final product", sortOrder: 2 }] } },
      { id: "p1-videos", parentId: "project-1", type: "folder", title: "Videos", sortOrder: 2, status: "published", metadata: {} },
      { id: "p1-demo", parentId: "p1-videos", type: "video", title: "Demo Video", sortOrder: 0, status: "published", metadata: { videoUrl: "", videoThumbnailUrl: "img/placeholder-video.jpg", duration: 90 } },
      { id: "p1-tryit", parentId: "project-1", type: "link", title: "Try It", sortOrder: 3, status: "published", metadata: { linkUrl: "https://example.com" } },
      { id: "project-2", parentId: "projects", type: "album", title: "Adobe Express Redesign", sortOrder: 1, status: "published", metadata: { coverImageUrl: "img/adobe-cover.jpg", artistName: "Harry Schwartz" } },
      { id: "music", parentId: null, type: "folder", title: "Music", sortOrder: 2, status: "published", metadata: { previewImage: "img/music-preview.jpg" } },
      { id: "music-coverflow", parentId: "music", type: "cover_flow_music", title: "Cover Flow", sortOrder: 0, status: "published", metadata: {} },
      { id: "music-playlists", parentId: "music", type: "folder", title: "Playlists", sortOrder: 1, status: "published", metadata: {} },
      { id: "dj-sets", parentId: "music-playlists", type: "playlist", title: "DJ Sets", sortOrder: 0, status: "published", metadata: { coverImageUrl: "img/dj-cover.jpg", songIds: ["dj-set-1", "dj-set-2"] } },
      { id: "dj-set-1", parentId: "dj-sets", type: "song", title: "Set @ Berkeley 2025", sortOrder: 0, status: "published", metadata: { artistName: "DJ Harry", albumName: "DJ Sets", duration: 3600, audioUrl: "" } },
      { id: "music-artists", parentId: "music", type: "folder", title: "Artists", sortOrder: 2, status: "published", metadata: {} },
      { id: "music-albums", parentId: "music", type: "folder", title: "Albums", sortOrder: 3, status: "published", metadata: {} },
      { id: "music-search", parentId: "music", type: "folder", title: "Search", sortOrder: 4, status: "published", metadata: {} },
      { id: "games", parentId: null, type: "folder", title: "Games", sortOrder: 3, status: "published", metadata: { previewImage: "img/games-preview.jpg" } },
      { id: "brick", parentId: "games", type: "game", title: "Brick", sortOrder: 0, status: "published", metadata: {} },
      { id: "about", parentId: null, type: "text", title: "About", sortOrder: 4, status: "published", metadata: { bodyText: "Harry Schwartz is an MBA/MEng student at UC Berkeley (Haas + Engineering) with a background in product design from Stanford. He's passionate about creative tools, AI, and the intersection of hardware and software. When he's not building things, he's DJing, skiing, or exploring new ideas across design, engineering, and culture.", links: [{ label: "LinkedIn", url: "https://linkedin.com/in/harryschwartz" }, { label: "GitHub", url: "https://github.com/harryschwartz" }] } },
      { id: "settings", parentId: null, type: "settings", title: "Settings", sortOrder: 5, status: "published", metadata: {} },
    ];

    for (const seed of seedNodes) {
      const now = new Date();
      this.nodes.set(seed.id, { id: seed.id, parentId: seed.parentId, type: seed.type, title: seed.title, sortOrder: seed.sortOrder, status: seed.status, createdAt: now, updatedAt: now });
      const meta = { id: randomUUID(), nodeId: seed.id, coverImageUrl: seed.metadata.coverImageUrl || null, artistName: seed.metadata.artistName || null, albumName: seed.metadata.albumName || null, audioUrl: seed.metadata.audioUrl || null, videoUrl: seed.metadata.videoUrl || null, videoThumbnailUrl: seed.metadata.videoThumbnailUrl || null, linkUrl: seed.metadata.linkUrl || null, duration: seed.metadata.duration || null, bodyText: seed.metadata.bodyText || null, previewImage: seed.metadata.previewImage || null, photos: seed.metadata.photos || null, links: seed.metadata.links || null, songIds: seed.metadata.songIds || null, coverImages: seed.metadata.coverImages || null };
      this.metadata.set(seed.id, meta);
    }
  }

  getWithMeta(node) {
    return { ...node, metadata: this.metadata.get(node.id) || null };
  }

  getAllNodes() { return Array.from(this.nodes.values()).sort((a, b) => a.sortOrder - b.sortOrder).map(n => this.getWithMeta(n)); }
  getNode(id) { const n = this.nodes.get(id); return n ? this.getWithMeta(n) : undefined; }
  getChildren(parentId) { return Array.from(this.nodes.values()).filter(n => n.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder).map(n => this.getWithMeta(n)); }

  createNode(data, metaData = {}) {
    const id = randomUUID();
    const now = new Date();
    const node = { id, parentId: data.parentId || null, type: data.type, title: data.title, sortOrder: data.sortOrder ?? 0, status: data.status || "draft", createdAt: now, updatedAt: now };
    this.nodes.set(id, node);
    const meta = { id: randomUUID(), nodeId: id, coverImageUrl: metaData.coverImageUrl || null, artistName: metaData.artistName || null, albumName: metaData.albumName || null, audioUrl: metaData.audioUrl || null, videoUrl: metaData.videoUrl || null, videoThumbnailUrl: metaData.videoThumbnailUrl || null, linkUrl: metaData.linkUrl || null, duration: metaData.duration || null, bodyText: metaData.bodyText || null, previewImage: metaData.previewImage || null, photos: metaData.photos || null, links: metaData.links || null, songIds: metaData.songIds || null, coverImages: metaData.coverImages || null };
    this.metadata.set(id, meta);
    return { ...node, metadata: meta };
  }

  updateNode(id, data, metaData) {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    const updated = { ...node, ...data, id: node.id, createdAt: node.createdAt, updatedAt: new Date() };
    this.nodes.set(id, updated);
    if (metaData) {
      const em = this.metadata.get(id);
      if (em) this.metadata.set(id, { ...em, ...metaData, nodeId: id });
    }
    return this.getWithMeta(updated);
  }

  deleteNode(id) {
    const node = this.nodes.get(id);
    if (!node) return false;
    for (const child of Array.from(this.nodes.values()).filter(n => n.parentId === id)) this.deleteNode(child.id);
    this.nodes.delete(id);
    this.metadata.delete(id);
    return true;
  }

  reorderNodes(parentId, orderedIds) {
    orderedIds.forEach((nid, i) => {
      const n = this.nodes.get(nid);
      if (n && n.parentId === parentId) { n.sortOrder = i; n.updatedAt = new Date(); }
    });
  }
}

const storage = new MemStorage();

// Routes
app.get("/api/nodes", (_req, res) => res.json(storage.getAllNodes()));
app.get("/api/nodes/:id", (req, res) => { const n = storage.getNode(req.params.id); n ? res.json(n) : res.status(404).json({ message: "Not found" }); });
app.get("/api/nodes/:id/children", (req, res) => { const pid = req.params.id === "root" ? null : req.params.id; res.json(storage.getChildren(pid)); });
app.post("/api/nodes", (req, res) => { const { metadata, ...data } = req.body; res.status(201).json(storage.createNode(data, metadata || {})); });
app.patch("/api/nodes/:id", (req, res) => { const { metadata, ...data } = req.body; const n = storage.updateNode(req.params.id, data, metadata); n ? res.json(n) : res.status(404).json({ message: "Not found" }); });
app.delete("/api/nodes/:id", (req, res) => { storage.deleteNode(req.params.id) ? res.json({ success: true }) : res.status(404).json({ message: "Not found" }); });
app.post("/api/nodes/:id/reorder", (req, res) => { const pid = req.params.id === "root" ? null : req.params.id; storage.reorderNodes(pid, req.body.orderedIds); res.json({ success: true }); });
app.post("/api/nodes/:id/publish", (req, res) => { const n = storage.updateNode(req.params.id, { status: "published" }); n ? res.json(n) : res.status(404).json({ message: "Not found" }); });
app.post("/api/nodes/:id/unpublish", (req, res) => { const n = storage.updateNode(req.params.id, { status: "draft" }); n ? res.json(n) : res.status(404).json({ message: "Not found" }); });
app.post("/api/upload/audio", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });
app.post("/api/upload/image", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });
app.post("/api/upload/video", upload.single("file"), (req, res) => { if (!req.file) return res.status(400).json({ message: "No file" }); res.json({ url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` }); });

export default app;
