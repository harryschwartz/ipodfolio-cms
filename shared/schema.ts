import { pgTable, text, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const menuNodes = pgTable("menu_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id"),
  type: text("type").notNull(), // folder, song, album, playlist, photo_album, video, link, text, game, settings, cover_flow_home, cover_flow_music
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft or published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nodeMetadata = pgTable("node_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: uuid("node_id").notNull().references(() => menuNodes.id, { onDelete: "cascade" }),
  coverImageUrl: text("cover_image_url"),
  coverImagePosition: text("cover_image_position"), // e.g. "50% 30%"
  coverImageZoom: text("cover_image_zoom"),          // e.g. "1.4"
  coverEmoji: text("cover_emoji"),
  coverColor: text("cover_color"),
  artistName: text("artist_name"),
  albumName: text("album_name"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  videoThumbnailUrl: text("video_thumbnail_url"),
  linkUrl: text("link_url"),
  duration: integer("duration"),
  bodyText: text("body_text"),
  previewImage: text("preview_image"),
  splitScreen: boolean("split_screen"),
  photos: jsonb("photos").$type<Array<{ url: string; caption?: string; sortOrder: number }>>(),
  links: jsonb("links").$type<Array<{ label: string; url: string }>>(),
  songIds: jsonb("song_ids").$type<string[]>(),
  coverImages: jsonb("cover_images").$type<string[]>(),
  transcription: jsonb("transcription").$type<{
    text: string;
    words: Array<{ word: string; start: number; end: number }>;
    segments: Array<{ start: number; end: number; text: string }>;
    duration: number;
  }>(),
});

export const insertMenuNodeSchema = createInsertSchema(menuNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNodeMetadataSchema = createInsertSchema(nodeMetadata).omit({
  id: true,
});

export type MenuNode = typeof menuNodes.$inferSelect;
export type InsertMenuNode = z.infer<typeof insertMenuNodeSchema>;
export type NodeMetadata = typeof nodeMetadata.$inferSelect;
export type InsertNodeMetadata = z.infer<typeof insertNodeMetadataSchema>;

// Combined type for API responses
export type MenuNodeWithMetadata = MenuNode & {
  metadata: NodeMetadata | null;
};
