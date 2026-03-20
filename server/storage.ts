import {
  type MenuNode,
  type InsertMenuNode,
  type NodeMetadata,
  type InsertNodeMetadata,
  type MenuNodeWithMetadata,
  menuNodes,
  nodeMetadata,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, asc, and, isNull } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getAllNodes(): Promise<MenuNodeWithMetadata[]>;
  getNode(id: string): Promise<MenuNodeWithMetadata | undefined>;
  getChildren(parentId: string | null): Promise<MenuNodeWithMetadata[]>;
  createNode(
    nodeData: InsertMenuNode,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata>;
  updateNode(
    id: string,
    nodeData: Partial<InsertMenuNode>,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata | undefined>;
  deleteNode(id: string): Promise<boolean>;
  reorderNodes(parentId: string | null, orderedIds: string[]): Promise<void>;
  getMetadata(nodeId: string): Promise<NodeMetadata | undefined>;
  updateMetadata(
    nodeId: string,
    data: Partial<InsertNodeMetadata>
  ): Promise<NodeMetadata | undefined>;
  ensureTables(): Promise<void>;
}

// ─── DATABASE STORAGE (Supabase / PostgreSQL via Drizzle) ───

export class DatabaseStorage implements IStorage {
  async ensureTables(): Promise<void> {
    if (!db) return;
    // Create tables if they don't exist using raw SQL
    await db.execute(`
      CREATE TABLE IF NOT EXISTS menu_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS node_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        node_id UUID NOT NULL REFERENCES menu_nodes(id) ON DELETE CASCADE,
        cover_image_url TEXT,
        artist_name TEXT,
        album_name TEXT,
        audio_url TEXT,
        video_url TEXT,
        video_thumbnail_url TEXT,
        link_url TEXT,
        duration INTEGER,
        body_text TEXT,
        preview_image TEXT,
        photos JSONB,
        links JSONB,
        song_ids JSONB,
        cover_images JSONB
      );
    `);

    // Seed if empty
    const existing = await db.select().from(menuNodes);
    if (existing.length === 0) {
      console.log("[storage] Database empty — seeding initial data...");
      await this.seedDatabase();
      console.log("[storage] Seed complete");
    } else {
      console.log(`[storage] Database has ${existing.length} nodes — skipping seed`);
    }
  }

  private async seedDatabase(): Promise<void> {
    if (!db) return;
    const seedNodes: Array<{
      id: string;
      parentId: string | null;
      type: string;
      title: string;
      sortOrder: number;
      status: string;
      metadata: Record<string, any>;
    }> = [
      {
        id: "00000000-0000-4000-a000-000000000001",
        parentId: null,
        type: "cover_flow_home",
        title: "Cover Flow",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000002",
        parentId: null,
        type: "folder",
        title: "Projects",
        sortOrder: 1,
        status: "published",
        metadata: { previewImage: "img/projects-preview.jpg" },
      },
      {
        id: "00000000-0000-4000-a000-000000000003",
        parentId: "00000000-0000-4000-a000-000000000002",
        type: "album",
        title: "Fusion 360 Headphones",
        sortOrder: 0,
        status: "published",
        metadata: {
          coverImageUrl: "img/headphones-cover.jpg",
          artistName: "Harry Schwartz",
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000004",
        parentId: "00000000-0000-4000-a000-000000000003",
        type: "folder",
        title: "Audio",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000005",
        parentId: "00000000-0000-4000-a000-000000000004",
        type: "song",
        title: "Why",
        sortOrder: 0,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 120,
          audioUrl: "",
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000006",
        parentId: "00000000-0000-4000-a000-000000000004",
        type: "song",
        title: "Creative Journey",
        sortOrder: 1,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 180,
          audioUrl: "",
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000007",
        parentId: "00000000-0000-4000-a000-000000000004",
        type: "song",
        title: "Learnings",
        sortOrder: 2,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 150,
          audioUrl: "",
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000008",
        parentId: "00000000-0000-4000-a000-000000000003",
        type: "photo_album",
        title: "Photos",
        sortOrder: 1,
        status: "published",
        metadata: {
          photos: [
            { url: "img/placeholder-1.jpg", caption: "Design sketch", sortOrder: 0 },
            { url: "img/placeholder-2.jpg", caption: "3D model", sortOrder: 1 },
            { url: "img/placeholder-3.jpg", caption: "Final product", sortOrder: 2 },
          ],
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000009",
        parentId: "00000000-0000-4000-a000-000000000003",
        type: "folder",
        title: "Videos",
        sortOrder: 2,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-00000000000a",
        parentId: "00000000-0000-4000-a000-000000000009",
        type: "video",
        title: "Demo Video",
        sortOrder: 0,
        status: "published",
        metadata: {
          videoUrl: "",
          videoThumbnailUrl: "img/placeholder-video.jpg",
          duration: 90,
        },
      },
      {
        id: "00000000-0000-4000-a000-00000000000b",
        parentId: "00000000-0000-4000-a000-000000000003",
        type: "link",
        title: "Try It",
        sortOrder: 3,
        status: "published",
        metadata: { linkUrl: "https://example.com" },
      },
      {
        id: "00000000-0000-4000-a000-00000000000c",
        parentId: "00000000-0000-4000-a000-000000000002",
        type: "album",
        title: "Adobe Express Redesign",
        sortOrder: 1,
        status: "published",
        metadata: {
          coverImageUrl: "img/adobe-cover.jpg",
          artistName: "Harry Schwartz",
        },
      },
      {
        id: "00000000-0000-4000-a000-00000000000d",
        parentId: null,
        type: "folder",
        title: "Music",
        sortOrder: 2,
        status: "published",
        metadata: { previewImage: "img/music-preview.jpg" },
      },
      {
        id: "00000000-0000-4000-a000-00000000000e",
        parentId: "00000000-0000-4000-a000-00000000000d",
        type: "cover_flow_music",
        title: "Cover Flow",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-00000000000f",
        parentId: "00000000-0000-4000-a000-00000000000d",
        type: "folder",
        title: "Playlists",
        sortOrder: 1,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000010",
        parentId: "00000000-0000-4000-a000-00000000000f",
        type: "playlist",
        title: "DJ Sets",
        sortOrder: 0,
        status: "published",
        metadata: {
          coverImageUrl: "img/dj-cover.jpg",
          songIds: ["00000000-0000-4000-a000-000000000011"],
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000011",
        parentId: "00000000-0000-4000-a000-000000000010",
        type: "song",
        title: "Set @ Berkeley 2025",
        sortOrder: 0,
        status: "published",
        metadata: {
          artistName: "DJ Harry",
          albumName: "DJ Sets",
          duration: 3600,
          audioUrl: "",
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000012",
        parentId: "00000000-0000-4000-a000-00000000000d",
        type: "folder",
        title: "Artists",
        sortOrder: 2,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000013",
        parentId: "00000000-0000-4000-a000-00000000000d",
        type: "folder",
        title: "Albums",
        sortOrder: 3,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000014",
        parentId: "00000000-0000-4000-a000-00000000000d",
        type: "folder",
        title: "Search",
        sortOrder: 4,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000015",
        parentId: null,
        type: "folder",
        title: "Games",
        sortOrder: 3,
        status: "published",
        metadata: { previewImage: "img/games-preview.jpg" },
      },
      {
        id: "00000000-0000-4000-a000-000000000016",
        parentId: "00000000-0000-4000-a000-000000000015",
        type: "game",
        title: "Brick",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "00000000-0000-4000-a000-000000000017",
        parentId: null,
        type: "text",
        title: "About",
        sortOrder: 4,
        status: "published",
        metadata: {
          bodyText:
            "Harry Schwartz is an MBA/MEng student at UC Berkeley (Haas + Engineering) with a background in product design from Stanford. He's passionate about creative tools, AI, and the intersection of hardware and software. When he's not building things, he's DJing, skiing, or exploring new ideas across design, engineering, and culture.",
          links: [
            { label: "LinkedIn", url: "https://linkedin.com/in/harryschwartz" },
            { label: "GitHub", url: "https://github.com/harryschwartz" },
          ],
        },
      },
      {
        id: "00000000-0000-4000-a000-000000000018",
        parentId: null,
        type: "settings",
        title: "Settings",
        sortOrder: 5,
        status: "published",
        metadata: {},
      },
    ];

    // Insert nodes first (parent references require ordering)
    for (const seed of seedNodes) {
      await db!.insert(menuNodes).values({
        id: seed.id,
        parentId: seed.parentId,
        type: seed.type,
        title: seed.title,
        sortOrder: seed.sortOrder,
        status: seed.status,
      });

      await db!.insert(nodeMetadata).values({
        nodeId: seed.id,
        coverImageUrl: seed.metadata.coverImageUrl || null,
        artistName: seed.metadata.artistName || null,
        albumName: seed.metadata.albumName || null,
        audioUrl: seed.metadata.audioUrl || null,
        videoUrl: seed.metadata.videoUrl || null,
        videoThumbnailUrl: seed.metadata.videoThumbnailUrl || null,
        linkUrl: seed.metadata.linkUrl || null,
        duration: seed.metadata.duration || null,
        bodyText: seed.metadata.bodyText || null,
        previewImage: seed.metadata.previewImage || null,
        photos: seed.metadata.photos || null,
        links: seed.metadata.links || null,
        songIds: seed.metadata.songIds || null,
        coverImages: seed.metadata.coverImages || null,
      });
    }
  }

  private combineNodeWithMetadata(
    node: typeof menuNodes.$inferSelect,
    meta: typeof nodeMetadata.$inferSelect | null
  ): MenuNodeWithMetadata {
    return { ...node, metadata: meta };
  }

  async getAllNodes(): Promise<MenuNodeWithMetadata[]> {
    if (!db) return [];
    const nodes = await db.select().from(menuNodes).orderBy(asc(menuNodes.sortOrder));
    const metas = await db.select().from(nodeMetadata);
    const metaMap = new Map(metas.map((m) => [m.nodeId, m]));
    return nodes.map((n) => this.combineNodeWithMetadata(n, metaMap.get(n.id) || null));
  }

  async getNode(id: string): Promise<MenuNodeWithMetadata | undefined> {
    if (!db) return undefined;
    const [node] = await db.select().from(menuNodes).where(eq(menuNodes.id, id));
    if (!node) return undefined;
    const [meta] = await db.select().from(nodeMetadata).where(eq(nodeMetadata.nodeId, id));
    return this.combineNodeWithMetadata(node, meta || null);
  }

  async getChildren(parentId: string | null): Promise<MenuNodeWithMetadata[]> {
    if (!db) return [];
    const condition = parentId === null
      ? isNull(menuNodes.parentId)
      : eq(menuNodes.parentId, parentId);
    const nodes = await db.select().from(menuNodes).where(condition).orderBy(asc(menuNodes.sortOrder));
    const metas = await db.select().from(nodeMetadata);
    const metaMap = new Map(metas.map((m) => [m.nodeId, m]));
    return nodes.map((n) => this.combineNodeWithMetadata(n, metaMap.get(n.id) || null));
  }

  async createNode(
    nodeData: InsertMenuNode,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata> {
    if (!db) throw new Error("Database not available");
    const [node] = await db.insert(menuNodes).values({
      parentId: nodeData.parentId || null,
      type: nodeData.type,
      title: nodeData.title,
      sortOrder: nodeData.sortOrder ?? 0,
      status: nodeData.status || "draft",
    }).returning();

    const [meta] = await db.insert(nodeMetadata).values({
      nodeId: node.id,
      coverImageUrl: metadataData?.coverImageUrl || null,
      artistName: metadataData?.artistName || null,
      albumName: metadataData?.albumName || null,
      audioUrl: metadataData?.audioUrl || null,
      videoUrl: metadataData?.videoUrl || null,
      videoThumbnailUrl: metadataData?.videoThumbnailUrl || null,
      linkUrl: metadataData?.linkUrl || null,
      duration: metadataData?.duration || null,
      bodyText: metadataData?.bodyText || null,
      previewImage: metadataData?.previewImage || null,
      photos: metadataData?.photos || null,
      links: metadataData?.links || null,
      songIds: metadataData?.songIds || null,
      coverImages: metadataData?.coverImages || null,
    }).returning();

    return { ...node, metadata: meta };
  }

  async updateNode(
    id: string,
    nodeData: Partial<InsertMenuNode>,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata | undefined> {
    if (!db) return undefined;
    const updateValues: Record<string, any> = { updatedAt: new Date() };
    if (nodeData.title !== undefined) updateValues.title = nodeData.title;
    if (nodeData.parentId !== undefined) updateValues.parentId = nodeData.parentId;
    if (nodeData.type !== undefined) updateValues.type = nodeData.type;
    if (nodeData.sortOrder !== undefined) updateValues.sortOrder = nodeData.sortOrder;
    if (nodeData.status !== undefined) updateValues.status = nodeData.status;

    const [node] = await db.update(menuNodes).set(updateValues).where(eq(menuNodes.id, id)).returning();
    if (!node) return undefined;

    if (metadataData) {
      await db.update(nodeMetadata).set(metadataData).where(eq(nodeMetadata.nodeId, id));
    }

    const [meta] = await db.select().from(nodeMetadata).where(eq(nodeMetadata.nodeId, id));
    return { ...node, metadata: meta || null };
  }

  async deleteNode(id: string): Promise<boolean> {
    if (!db) return false;
    // Recursively delete children first
    const children = await db.select().from(menuNodes).where(eq(menuNodes.parentId, id));
    for (const child of children) {
      await this.deleteNode(child.id);
    }
    // Delete metadata then node (cascade should handle it, but be explicit)
    await db.delete(nodeMetadata).where(eq(nodeMetadata.nodeId, id));
    const result = await db.delete(menuNodes).where(eq(menuNodes.id, id)).returning();
    return result.length > 0;
  }

  async reorderNodes(parentId: string | null, orderedIds: string[]): Promise<void> {
    if (!db) return;
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(menuNodes)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(menuNodes.id, orderedIds[i]));
    }
  }

  async getMetadata(nodeId: string): Promise<NodeMetadata | undefined> {
    if (!db) return undefined;
    const [meta] = await db.select().from(nodeMetadata).where(eq(nodeMetadata.nodeId, nodeId));
    return meta || undefined;
  }

  async updateMetadata(
    nodeId: string,
    data: Partial<InsertNodeMetadata>
  ): Promise<NodeMetadata | undefined> {
    if (!db) return undefined;
    const [updated] = await db.update(nodeMetadata).set(data).where(eq(nodeMetadata.nodeId, nodeId)).returning();
    return updated || undefined;
  }
}

// ─── IN-MEMORY STORAGE (fallback when no DATABASE_URL) ───

export class MemStorage implements IStorage {
  private nodes: Map<string, MenuNode>;
  private metadata: Map<string, NodeMetadata>;

  constructor() {
    this.nodes = new Map();
    this.metadata = new Map();
    this.seedData();
  }

  async ensureTables(): Promise<void> {
    // No-op for in-memory storage
  }

  private seedData() {
    const seedNodes: Array<{
      id: string;
      parentId: string | null;
      type: string;
      title: string;
      sortOrder: number;
      status: string;
      metadata: Record<string, any>;
    }> = [
      {
        id: "cover-flow",
        parentId: null,
        type: "cover_flow_home",
        title: "Cover Flow",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "projects",
        parentId: null,
        type: "folder",
        title: "Projects",
        sortOrder: 1,
        status: "published",
        metadata: { previewImage: "img/projects-preview.jpg" },
      },
      {
        id: "project-1",
        parentId: "projects",
        type: "album",
        title: "Fusion 360 Headphones",
        sortOrder: 0,
        status: "published",
        metadata: {
          coverImageUrl: "img/headphones-cover.jpg",
          artistName: "Harry Schwartz",
        },
      },
      {
        id: "p1-audio",
        parentId: "project-1",
        type: "folder",
        title: "Audio",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "p1-why",
        parentId: "p1-audio",
        type: "song",
        title: "Why",
        sortOrder: 0,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 120,
          audioUrl: "",
        },
      },
      {
        id: "p1-journey",
        parentId: "p1-audio",
        type: "song",
        title: "Creative Journey",
        sortOrder: 1,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 180,
          audioUrl: "",
        },
      },
      {
        id: "p1-learnings",
        parentId: "p1-audio",
        type: "song",
        title: "Learnings",
        sortOrder: 2,
        status: "published",
        metadata: {
          artistName: "Harry Schwartz",
          albumName: "Fusion 360 Headphones",
          duration: 150,
          audioUrl: "",
        },
      },
      {
        id: "p1-photos",
        parentId: "project-1",
        type: "photo_album",
        title: "Photos",
        sortOrder: 1,
        status: "published",
        metadata: {
          photos: [
            { url: "img/placeholder-1.jpg", caption: "Design sketch", sortOrder: 0 },
            { url: "img/placeholder-2.jpg", caption: "3D model", sortOrder: 1 },
            { url: "img/placeholder-3.jpg", caption: "Final product", sortOrder: 2 },
          ],
        },
      },
      {
        id: "p1-videos",
        parentId: "project-1",
        type: "folder",
        title: "Videos",
        sortOrder: 2,
        status: "published",
        metadata: {},
      },
      {
        id: "p1-demo",
        parentId: "p1-videos",
        type: "video",
        title: "Demo Video",
        sortOrder: 0,
        status: "published",
        metadata: {
          videoUrl: "",
          videoThumbnailUrl: "img/placeholder-video.jpg",
          duration: 90,
        },
      },
      {
        id: "p1-tryit",
        parentId: "project-1",
        type: "link",
        title: "Try It",
        sortOrder: 3,
        status: "published",
        metadata: { linkUrl: "https://example.com" },
      },
      {
        id: "project-2",
        parentId: "projects",
        type: "album",
        title: "Adobe Express Redesign",
        sortOrder: 1,
        status: "published",
        metadata: {
          coverImageUrl: "img/adobe-cover.jpg",
          artistName: "Harry Schwartz",
        },
      },
      {
        id: "music",
        parentId: null,
        type: "folder",
        title: "Music",
        sortOrder: 2,
        status: "published",
        metadata: { previewImage: "img/music-preview.jpg" },
      },
      {
        id: "music-coverflow",
        parentId: "music",
        type: "cover_flow_music",
        title: "Cover Flow",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "music-playlists",
        parentId: "music",
        type: "folder",
        title: "Playlists",
        sortOrder: 1,
        status: "published",
        metadata: {},
      },
      {
        id: "dj-sets",
        parentId: "music-playlists",
        type: "playlist",
        title: "DJ Sets",
        sortOrder: 0,
        status: "published",
        metadata: {
          coverImageUrl: "img/dj-cover.jpg",
          songIds: ["dj-set-1", "dj-set-2"],
        },
      },
      {
        id: "dj-set-1",
        parentId: "dj-sets",
        type: "song",
        title: "Set @ Berkeley 2025",
        sortOrder: 0,
        status: "published",
        metadata: {
          artistName: "DJ Harry",
          albumName: "DJ Sets",
          duration: 3600,
          audioUrl: "",
        },
      },
      {
        id: "music-artists",
        parentId: "music",
        type: "folder",
        title: "Artists",
        sortOrder: 2,
        status: "published",
        metadata: {},
      },
      {
        id: "music-albums",
        parentId: "music",
        type: "folder",
        title: "Albums",
        sortOrder: 3,
        status: "published",
        metadata: {},
      },
      {
        id: "music-search",
        parentId: "music",
        type: "folder",
        title: "Search",
        sortOrder: 4,
        status: "published",
        metadata: {},
      },
      {
        id: "games",
        parentId: null,
        type: "folder",
        title: "Games",
        sortOrder: 3,
        status: "published",
        metadata: { previewImage: "img/games-preview.jpg" },
      },
      {
        id: "brick",
        parentId: "games",
        type: "game",
        title: "Brick",
        sortOrder: 0,
        status: "published",
        metadata: {},
      },
      {
        id: "about",
        parentId: null,
        type: "text",
        title: "About",
        sortOrder: 4,
        status: "published",
        metadata: {
          bodyText:
            "Harry Schwartz is an MBA/MEng student at UC Berkeley (Haas + Engineering) with a background in product design from Stanford. He's passionate about creative tools, AI, and the intersection of hardware and software. When he's not building things, he's DJing, skiing, or exploring new ideas across design, engineering, and culture.",
          links: [
            { label: "LinkedIn", url: "https://linkedin.com/in/harryschwartz" },
            { label: "GitHub", url: "https://github.com/harryschwartz" },
          ],
        },
      },
      {
        id: "settings",
        parentId: null,
        type: "settings",
        title: "Settings",
        sortOrder: 5,
        status: "published",
        metadata: {},
      },
    ];

    for (const seed of seedNodes) {
      const now = new Date();
      const node: MenuNode = {
        id: seed.id,
        parentId: seed.parentId,
        type: seed.type,
        title: seed.title,
        sortOrder: seed.sortOrder,
        status: seed.status,
        createdAt: now,
        updatedAt: now,
      };
      this.nodes.set(seed.id, node);

      const metaId = randomUUID();
      const meta: NodeMetadata = {
        id: metaId,
        nodeId: seed.id,
        coverImageUrl: seed.metadata.coverImageUrl || null,
        artistName: seed.metadata.artistName || null,
        albumName: seed.metadata.albumName || null,
        audioUrl: seed.metadata.audioUrl || null,
        videoUrl: seed.metadata.videoUrl || null,
        videoThumbnailUrl: seed.metadata.videoThumbnailUrl || null,
        linkUrl: seed.metadata.linkUrl || null,
        duration: seed.metadata.duration || null,
        bodyText: seed.metadata.bodyText || null,
        previewImage: seed.metadata.previewImage || null,
        photos: seed.metadata.photos || null,
        links: seed.metadata.links || null,
        songIds: seed.metadata.songIds || null,
        coverImages: seed.metadata.coverImages || null,
      };
      this.metadata.set(seed.id, meta);
    }
  }

  private getNodeWithMetadata(node: MenuNode): MenuNodeWithMetadata {
    const meta = this.metadata.get(node.id) || null;
    return { ...node, metadata: meta };
  }

  async getAllNodes(): Promise<MenuNodeWithMetadata[]> {
    return Array.from(this.nodes.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => this.getNodeWithMetadata(n));
  }

  async getNode(id: string): Promise<MenuNodeWithMetadata | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    return this.getNodeWithMetadata(node);
  }

  async getChildren(parentId: string | null): Promise<MenuNodeWithMetadata[]> {
    return Array.from(this.nodes.values())
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => this.getNodeWithMetadata(n));
  }

  async createNode(
    nodeData: InsertMenuNode,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata> {
    const id = randomUUID();
    const now = new Date();
    const node: MenuNode = {
      id,
      parentId: nodeData.parentId || null,
      type: nodeData.type,
      title: nodeData.title,
      sortOrder: nodeData.sortOrder ?? 0,
      status: nodeData.status || "draft",
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(id, node);

    const metaId = randomUUID();
    const meta: NodeMetadata = {
      id: metaId,
      nodeId: id,
      coverImageUrl: metadataData?.coverImageUrl || null,
      artistName: metadataData?.artistName || null,
      albumName: metadataData?.albumName || null,
      audioUrl: metadataData?.audioUrl || null,
      videoUrl: metadataData?.videoUrl || null,
      videoThumbnailUrl: metadataData?.videoThumbnailUrl || null,
      linkUrl: metadataData?.linkUrl || null,
      duration: metadataData?.duration || null,
      bodyText: metadataData?.bodyText || null,
      previewImage: metadataData?.previewImage || null,
      photos: metadataData?.photos || null,
      links: metadataData?.links || null,
      songIds: metadataData?.songIds || null,
      coverImages: metadataData?.coverImages || null,
    };
    this.metadata.set(id, meta);

    return { ...node, metadata: meta };
  }

  async updateNode(
    id: string,
    nodeData: Partial<InsertMenuNode>,
    metadataData?: Partial<InsertNodeMetadata>
  ): Promise<MenuNodeWithMetadata | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    const updated: MenuNode = {
      ...node,
      ...nodeData,
      id: node.id,
      createdAt: node.createdAt,
      updatedAt: new Date(),
    };
    this.nodes.set(id, updated);

    if (metadataData) {
      const existingMeta = this.metadata.get(id);
      if (existingMeta) {
        const updatedMeta: NodeMetadata = { ...existingMeta, ...metadataData, nodeId: id };
        this.metadata.set(id, updatedMeta);
      }
    }

    return this.getNodeWithMetadata(updated);
  }

  async deleteNode(id: string): Promise<boolean> {
    const node = this.nodes.get(id);
    if (!node) return false;

    const children = Array.from(this.nodes.values()).filter(
      (n) => n.parentId === id
    );
    for (const child of children) {
      await this.deleteNode(child.id);
    }

    this.nodes.delete(id);
    this.metadata.delete(id);
    return true;
  }

  async reorderNodes(
    parentId: string | null,
    orderedIds: string[]
  ): Promise<void> {
    orderedIds.forEach((nodeId, index) => {
      const node = this.nodes.get(nodeId);
      if (node && node.parentId === parentId) {
        node.sortOrder = index;
        node.updatedAt = new Date();
        this.nodes.set(nodeId, node);
      }
    });
  }

  async getMetadata(nodeId: string): Promise<NodeMetadata | undefined> {
    return this.metadata.get(nodeId);
  }

  async updateMetadata(
    nodeId: string,
    data: Partial<InsertNodeMetadata>
  ): Promise<NodeMetadata | undefined> {
    const existing = this.metadata.get(nodeId);
    if (!existing) return undefined;
    const updated: NodeMetadata = { ...existing, ...data, nodeId };
    this.metadata.set(nodeId, updated);
    return updated;
  }
}

// ─── STORAGE INSTANCE ───
// Uses DatabaseStorage if DATABASE_URL is set, otherwise falls back to MemStorage

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();

console.log(`[storage] Using ${process.env.DATABASE_URL ? "PostgreSQL (Supabase)" : "in-memory"} storage`);
