import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize database tables and seed data if using DB storage
  try {
    await storage.ensureTables();
    console.log("[routes] Database tables ensured");
  } catch (err) {
    console.error("[routes] Failed to ensure tables:", err);
  }

  // ─── PUBLIC API (CORS-enabled, read-only) ───
  // Returns published nodes for the iPodfolio frontend to consume
  app.get("/api/public/nodes", async (_req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-cache",
    });
    const allNodes = await storage.getAllNodes();
    // Only return published nodes, mapped to the shape the iPodfolio site expects
    const published = allNodes
      .filter((n) => n.status === "published")
      .map((n) => ({
        id: n.id,
        parentId: n.parentId,
        type: n.type,
        title: n.title,
        sortOrder: n.sortOrder,
        metadata: n.metadata
          ? {
              coverImage: n.metadata.coverImageUrl || undefined,
              coverImageUrl: n.metadata.coverImageUrl || undefined,
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
              transcription: n.metadata.transcription || undefined,
            }
          : {},
      }));
    res.json(published);
  });

  // Handle CORS preflight for public API
  app.options("/api/public/nodes", (_req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.sendStatus(204);
  });

  // ─── PREVIEW API (CORS-enabled, all nodes including drafts) ───
  app.get("/api/preview/nodes", async (_req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-cache",
    });
    const allNodes = await storage.getAllNodes();
    res.json(allNodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      type: n.type,
      title: n.title,
      sortOrder: n.sortOrder,
      metadata: n.metadata
        ? {
            coverImage: n.metadata.coverImageUrl || undefined,
            coverImageUrl: n.metadata.coverImageUrl || undefined,
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
            transcription: n.metadata.transcription || undefined,
          }
        : {},
    })));
  });

  // Handle CORS preflight for preview API
  app.options("/api/preview/nodes", (_req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.sendStatus(204);
  });

  // ─── ADMIN API (internal CMS use) ───
  // Get all nodes (flat list with metadata)
  app.get("/api/nodes", async (_req, res) => {
    const nodes = await storage.getAllNodes();
    res.json(nodes);
  });

  // Get single node with metadata
  app.get("/api/nodes/:id", async (req, res) => {
    const node = await storage.getNode(req.params.id);
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
    res.json(node);
  });

  // Get children of a node
  app.get("/api/nodes/:id/children", async (req, res) => {
    const parentId = req.params.id === "root" ? null : req.params.id;
    const children = await storage.getChildren(parentId);
    res.json(children);
  });

  // Create new node
  app.post("/api/nodes", async (req, res) => {
    const { metadata, ...nodeData } = req.body;
    const node = await storage.createNode(nodeData, metadata || {});
    res.status(201).json(node);
  });

  // Update node
  app.patch("/api/nodes/:id", async (req, res) => {
    const { metadata, ...nodeData } = req.body;
    const node = await storage.updateNode(req.params.id, nodeData, metadata);
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
    if (nodeData.status) {
      await syncTranscriptStatus(node, nodeData.status);
    }
    res.json(node);
  });

  // Delete node and descendants
  app.delete("/api/nodes/:id", async (req, res) => {
    const FOLDER_TITLE = "i prefer to read 🤓";

    // Before deleting, check if this is a song node and cascade-delete its transcript
    const nodeToDelete = await storage.getNode(req.params.id);
    if (nodeToDelete && nodeToDelete.type === "song" && nodeToDelete.parentId) {
      const siblings = await storage.getChildren(nodeToDelete.parentId);
      const readFolder = siblings.find(
        (n) => n.type === "folder" && n.title === FOLDER_TITLE
      );
      if (readFolder) {
        const folderChildren = await storage.getChildren(readFolder.id);
        const matchingText = folderChildren.find(
          (n) => n.type === "text" && n.title === nodeToDelete.title
        );
        if (matchingText) {
          await storage.deleteNode(matchingText.id);
        }
        // If the folder is now empty, delete it too
        const remaining = await storage.getChildren(readFolder.id);
        if (remaining.length === 0) {
          await storage.deleteNode(readFolder.id);
        }
      }
    }

    const success = await storage.deleteNode(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Node not found" });
    }
    res.json({ success: true });
  });

  // Reorder children
  app.post("/api/nodes/:id/reorder", async (req, res) => {
    const parentId = req.params.id === "root" ? null : req.params.id;
    const { orderedIds } = req.body;
    await storage.reorderNodes(parentId, orderedIds);
    res.json({ success: true });
  });

  // Helper: sync transcript text node status when a song's status changes
  async function syncTranscriptStatus(songNode: { type: string; parentId: string | null; title: string }, newStatus: string) {
    const FOLDER_TITLE = "i prefer to read 🤓";
    if (songNode.type !== "song" || !songNode.parentId) return;
    const siblings = await storage.getChildren(songNode.parentId);
    const readFolder = siblings.find(
      (n) => n.type === "folder" && n.title === FOLDER_TITLE
    );
    if (!readFolder) return;
    const folderChildren = await storage.getChildren(readFolder.id);
    const matchingText = folderChildren.find(
      (n) => n.type === "text" && n.title === songNode.title
    );
    if (matchingText) {
      await storage.updateNode(matchingText.id, { status: newStatus });
    }
  }

  // Publish
  app.post("/api/nodes/:id/publish", async (req, res) => {
    const node = await storage.updateNode(req.params.id, { status: "published" });
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
    await syncTranscriptStatus(node, "published");
    res.json(node);
  });

  // Unpublish
  app.post("/api/nodes/:id/unpublish", async (req, res) => {
    const node = await storage.updateNode(req.params.id, { status: "draft" });
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
    await syncTranscriptStatus(node, "draft");
    res.json(node);
  });

  // Upload audio
  app.post("/api/upload/audio", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    res.json({ url: dataUrl });
  });

  // Upload image
  app.post("/api/upload/image", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    res.json({ url: dataUrl });
  });

  // ─── ITUNES PROXY ───
  // Search iTunes catalog (avoids CORS)
  app.get("/api/itunes/search", async (req, res) => {
    const term = req.query.term as string;
    if (!term) {
      return res.status(400).json({ message: "Missing 'term' parameter" });
    }
    const entity = (req.query.entity as string) || "song";
    const limit = (req.query.limit as string) || "25";
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=${encodeURIComponent(entity)}&limit=${encodeURIComponent(limit)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ message: `iTunes API error: ${err.message}` });
    }
  });

  // Lookup album tracks via iTunes
  app.get("/api/itunes/lookup", async (req, res) => {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ message: "Missing 'id' parameter" });
    }
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ message: `iTunes API error: ${err.message}` });
    }
  });

  // Upload video
  app.post("/api/upload/video", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    res.json({ url: dataUrl });
  });

  return httpServer;
}
