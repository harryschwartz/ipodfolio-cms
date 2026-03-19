import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
    res.json(node);
  });

  // Delete node and descendants
  app.delete("/api/nodes/:id", async (req, res) => {
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

  // Publish
  app.post("/api/nodes/:id/publish", async (req, res) => {
    const node = await storage.updateNode(req.params.id, { status: "published" });
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
    res.json(node);
  });

  // Unpublish
  app.post("/api/nodes/:id/unpublish", async (req, res) => {
    const node = await storage.updateNode(req.params.id, { status: "draft" });
    if (!node) {
      return res.status(404).json({ message: "Node not found" });
    }
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
