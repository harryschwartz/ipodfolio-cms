import { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronRight,
  Folder,
  Music,
  Disc3,
  ListMusic,
  Image,
  Video,
  Link2,
  FileText,
  Settings,
  Gamepad2,
  Layers,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { NodeEditor } from "@/components/node-editor";
import { AudioBadge } from "@/components/audio-badge";
import { ITunesSearchDialog, getHighResArt } from "@/components/itunes-search-dialog";
import type { ITunesTrack } from "@/components/itunes-search-dialog";
import { isHiddenMusicChild, MUSIC_FOLDER_ID } from "@/components/music-library-view";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const TYPE_ICONS: Record<string, any> = {
  folder: Folder,
  song: Music,
  album: Disc3,
  playlist: ListMusic,
  photo_album: Image,
  video: Video,
  link: Link2,
  text: FileText,
  settings: Settings,
  game: Gamepad2,
  cover_flow_home: Layers,
  cover_flow_music: Layers,
};

const TYPE_ICON_STYLE: Record<string, string> = {
  folder:          "bg-amber-100   text-amber-600",
  song:            "bg-emerald-100 text-emerald-600",
  album:           "bg-purple-100  text-purple-600",
  playlist:        "bg-blue-100    text-blue-600",
  photo_album:     "bg-pink-100    text-pink-600",
  video:           "bg-red-100     text-red-600",
  link:            "bg-cyan-100    text-cyan-600",
  text:            "bg-slate-100   text-slate-600",
  settings:        "bg-gray-100    text-gray-500",
  game:            "bg-orange-100  text-orange-600",
  cover_flow_home: "bg-indigo-100  text-indigo-600",
  cover_flow_music:"bg-violet-100  text-violet-600",
};

const FOLDER_TYPES = new Set(["folder", "album", "playlist", "photo_album"]);

const TYPE_LABELS: Record<string, [string, string]> = {
  folder: ["folder", "folders"],
  song: ["song", "songs"],
  album: ["album", "albums"],
  playlist: ["playlist", "playlists"],
  photo_album: ["photo album", "photo albums"],
  video: ["video", "videos"],
  link: ["link", "links"],
  text: ["text", "texts"],
  settings: ["settings", "settings"],
  game: ["game", "games"],
  cover_flow_home: ["cover flow", "cover flows"],
  cover_flow_music: ["cover flow", "cover flows"],
};

function getChildrenSummary(nodeId: string, nodes: MenuNodeWithMetadata[]): string {
  const children = nodes.filter((n) => n.parentId === nodeId && !isHiddenMusicChild(n.id, n.parentId));
  if (children.length === 0) return "";
  const counts = new Map<string, number>();
  for (const child of children) {
    counts.set(child.type, (counts.get(child.type) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => {
      const [singular, plural] = TYPE_LABELS[type] || [type.replace(/_/g, " "), type.replace(/_/g, " ") + "s"];
      return `${count} ${count === 1 ? singular : plural}`;
    })
    .join(", ");
}

function isContainerNode(node: MenuNodeWithMetadata, nodes: MenuNodeWithMetadata[]): boolean {
  return FOLDER_TYPES.has(node.type) || nodes.some((n) => n.parentId === node.id);
}

// ── Single item row inside a column ──────────────────────────────────────────
function ColumnItem({
  node,
  nodes,
  isSelected,
  isMultiSelected,
  isInPath,
  isDragAbove,
  isDragBelow,
  isFolderDropTarget,
  onClick,
  onLongPress,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: MenuNodeWithMetadata;
  nodes: MenuNodeWithMetadata[];
  isSelected: boolean;
  isMultiSelected: boolean;
  isInPath: boolean;
  isDragAbove: boolean;
  isDragBelow: boolean;
  isFolderDropTarget: boolean;
  onClick: (e: React.MouseEvent) => void;
  onLongPress: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const Icon = TYPE_ICONS[node.type] || FileText;
  const iconStyle = TYPE_ICON_STYLE[node.type] || "bg-gray-100 text-gray-500";
  const nodeIsContainer = isContainerNode(node, nodes);
  const isPublished = node.status === "published";

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const handleTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none group transition-colors duration-75",
        isMultiSelected
          ? "bg-indigo-100 text-foreground"
          : isSelected
          ? "bg-primary text-primary-foreground"
          : isInPath
          ? "bg-primary/10 text-foreground"
          : "text-foreground/80 hover:bg-muted/70 hover:text-foreground",
        isDragAbove && "border-t-2 border-primary",
        isDragBelow && "border-b-2 border-primary",
        isFolderDropTarget && !isSelected && "bg-primary/15 ring-2 ring-inset ring-primary/40 rounded-md"
      )}
      onClick={(e) => { if (didLongPress.current) { didLongPress.current = false; return; } onClick(e); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isMultiSelected ? (
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-indigo-500">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      ) : (
        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
          isSelected ? "bg-white/20" : iconStyle
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}

      <div className="truncate flex-1 min-w-0">
        <span className="truncate block text-sm font-medium">{node.title}</span>
        {nodeIsContainer && (() => {
          const summary = getChildrenSummary(node.id, nodes);
          return summary ? (
            <span className={cn(
              "truncate block text-[10px]",
              isSelected ? "text-primary-foreground/60" : "text-muted-foreground/70"
            )}>
              {summary}
            </span>
          ) : null;
        })()}
      </div>

      {(node.metadata as any)?.audioUrl && (
        <AudioBadge
          audioUrl={(node.metadata as any).audioUrl}
          duration={(node.metadata as any)?.duration}
        />
      )}

      {isPublished && !isSelected && !isMultiSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Published" />
      )}

      {nodeIsContainer && !isMultiSelected && (
        <ChevronRight className={cn(
          "h-3.5 w-3.5 flex-shrink-0",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground/50"
        )} />
      )}
    </div>
  );
}

// ── A single column panel ─────────────────────────────────────────────────────
function BrowserColumn({
  parentId,
  nodes,
  columnPath,
  selectedNodeId,
  selectedIds,
  onClickNode,
  onLongPressNode,
  onAddNode,
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDropOnBackground,
}: {
  parentId: string | null;
  nodes: MenuNodeWithMetadata[];
  columnPath: string[];
  selectedNodeId: string | null;
  selectedIds: Set<string>;
  onClickNode: (node: MenuNodeWithMetadata, e: React.MouseEvent) => void;
  onLongPressNode: (node: MenuNodeWithMetadata) => void;
  onAddNode: (parentId: string | null) => void;
  dragState: { dragOverId: string | null; dragOverPosition: "above" | "below" | null; dropFolderId: string | null };
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  onDropOnBackground: (e: React.DragEvent, parentId: string | null) => void;
}) {
  const items = nodes
    .filter((n) => n.parentId === parentId && !isHiddenMusicChild(n.id, n.parentId))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [itunesOpen, setItunesOpen] = useState(false);

  // Check if this column is a playlist under the Music folder
  const parentNode = parentId ? nodes.find((n) => n.id === parentId) : null;
  const isPlaylistUnderMusic = parentNode?.type === "playlist" && parentNode?.parentId === MUSIC_FOLDER_ID;

  // When adding iTunes tracks to a playlist under Music, also create library copies
  const handlePlaylistAddFromItunes = useCallback(async (tracks: ITunesTrack[]) => {
    if (!parentId) return;
    const librarySongs = nodes.filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "song");
    let librarySortOrder = librarySongs.length;
    let playlistSortOrder = items.length;

    for (const track of tracks) {
      // 1. Create song in the library
      const libRes = await apiRequest("POST", "/api/nodes", {
        parentId: MUSIC_FOLDER_ID,
        type: "song",
        title: track.trackName,
        sortOrder: librarySortOrder++,
        status: "published",
        metadata: {
          audioUrl: track.previewUrl || null,
          coverImageUrl: getHighResArt(track.artworkUrl100) || null,
          artistName: track.artistName || null,
          albumName: track.collectionName || null,
          trackNumber: track.trackNumber || null,
        },
      });
      const librarySong = await libRes.json();

      // 2. Create playlist reference pointing to the library song
      await apiRequest("POST", "/api/nodes", {
        parentId,
        type: "song",
        title: track.trackName,
        sortOrder: playlistSortOrder++,
        status: "published",
        metadata: {
          audioUrl: track.previewUrl || null,
          coverImageUrl: getHighResArt(track.artworkUrl100) || null,
          artistName: track.artistName || null,
          albumName: track.collectionName || null,
          trackNumber: track.trackNumber || null,
          sourceNodeId: librarySong.id,
        },
      });
    }
  }, [parentId, nodes, items.length]);

  const handleBackgroundDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBackgroundDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDropOnBackground(e, parentId);
  };

  return (
    <div
      className="flex flex-col w-52 shrink-0 border-r border-border bg-background h-full overflow-hidden"
      onDragOver={handleBackgroundDragOver}
      onDrop={handleBackgroundDrop}
    >
      {/* Column header with add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {parentId
            ? (nodes.find((n) => n.id === parentId)?.title ?? "Items")
            : "Library"}
        </span>
        <div className="flex items-center gap-0.5">
          {parentId && (
            <button
              onClick={() => setItunesOpen(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Add from iTunes"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onAddNode(parentId)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Add item"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {parentId && (
        <ITunesSearchDialog
          open={itunesOpen}
          onOpenChange={setItunesOpen}
          parentId={isPlaylistUnderMusic ? MUSIC_FOLDER_ID : parentId}
          existingChildCount={isPlaylistUnderMusic
            ? nodes.filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "song").length
            : items.length}
          onAddTracks={isPlaylistUnderMusic ? handlePlaylistAddFromItunes : undefined}
        />
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto py-1">
        {items.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground/60 text-center">
            Empty
          </div>
        ) : parentId === MUSIC_FOLDER_ID ? (
          <>
            {/* Playlists section */}
            {items.filter((n) => n.type === "playlist").length > 0 && (
              <>
                <div className="px-3 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Playlists
                </div>
                {items.filter((n) => n.type === "playlist").map((node) => (
                  <ColumnItem
                    key={node.id}
                    node={node}
                    nodes={nodes}
                    isSelected={node.id === selectedNodeId}
                    isMultiSelected={selectedIds.has(node.id)}
                    isInPath={columnPath.includes(node.id)}
                    isDragAbove={node.id === dragState.dragOverId && dragState.dragOverPosition === "above"}
                    isDragBelow={node.id === dragState.dragOverId && dragState.dragOverPosition === "below"}
                    isFolderDropTarget={node.id === dragState.dropFolderId}
                    onClick={(e) => onClickNode(node, e)}
                    onLongPress={() => onLongPressNode(node)}
                    onDragStart={(e) => onDragStart(e, node.id)}
                    onDragOver={(e) => onDragOver(e, node.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, node.id)}
                  />
                ))}
              </>
            )}
            {/* Divider between sections */}
            {items.filter((n) => n.type === "playlist").length > 0 &&
              items.filter((n) => n.type === "song").length > 0 && (
              <div className="mx-3 my-1.5 border-t border-border/50" />
            )}
            {/* Library section */}
            {items.filter((n) => n.type === "song").length > 0 && (
              <>
                <div className="px-3 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Library
                </div>
                {items.filter((n) => n.type === "song").map((node) => (
                  <ColumnItem
                    key={node.id}
                    node={node}
                    nodes={nodes}
                    isSelected={node.id === selectedNodeId}
                    isMultiSelected={selectedIds.has(node.id)}
                    isInPath={columnPath.includes(node.id)}
                    isDragAbove={node.id === dragState.dragOverId && dragState.dragOverPosition === "above"}
                    isDragBelow={node.id === dragState.dragOverId && dragState.dragOverPosition === "below"}
                    isFolderDropTarget={node.id === dragState.dropFolderId}
                    onClick={(e) => onClickNode(node, e)}
                    onLongPress={() => onLongPressNode(node)}
                    onDragStart={(e) => onDragStart(e, node.id)}
                    onDragOver={(e) => onDragOver(e, node.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, node.id)}
                  />
                ))}
              </>
            )}
            {/* Other types (albums, etc.) */}
            {items.filter((n) => n.type !== "playlist" && n.type !== "song").map((node) => (
              <ColumnItem
                key={node.id}
                node={node}
                nodes={nodes}
                isSelected={node.id === selectedNodeId}
                isMultiSelected={selectedIds.has(node.id)}
                isInPath={columnPath.includes(node.id)}
                isDragAbove={node.id === dragState.dragOverId && dragState.dragOverPosition === "above"}
                isDragBelow={node.id === dragState.dragOverId && dragState.dragOverPosition === "below"}
                isFolderDropTarget={node.id === dragState.dropFolderId}
                onClick={(e) => onClickNode(node, e)}
                onLongPress={() => onLongPressNode(node)}
                onDragStart={(e) => onDragStart(e, node.id)}
                onDragOver={(e) => onDragOver(e, node.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, node.id)}
              />
            ))}
          </>
        ) : (
          items.map((node) => (
            <ColumnItem
              key={node.id}
              node={node}
              nodes={nodes}
              isSelected={node.id === selectedNodeId}
              isMultiSelected={selectedIds.has(node.id)}
              isInPath={columnPath.includes(node.id)}
              isDragAbove={node.id === dragState.dragOverId && dragState.dragOverPosition === "above"}
              isDragBelow={node.id === dragState.dragOverId && dragState.dragOverPosition === "below"}
              isFolderDropTarget={node.id === dragState.dropFolderId}
              onClick={(e) => onClickNode(node, e)}
              onLongPress={() => onLongPressNode(node)}
              onDragStart={(e) => onDragStart(e, node.id)}
              onDragOver={(e) => onDragOver(e, node.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, node.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const COLUMN_PANEL_KEY = "cms-column-panel-size";

function getStoredColumnPanelSize(fallback: number): number {
  try {
    const v = localStorage.getItem(COLUMN_PANEL_KEY);
    if (v) {
      const n = parseFloat(v);
      if (isFinite(n) && n > 0 && n < 100) return n;
    }
  } catch {}
  return fallback;
}

function storeColumnPanelSize(size: number) {
  try { localStorage.setItem(COLUMN_PANEL_KEY, String(size)); } catch {}
}

// ── Main ColumnBrowser component ─────────────────────────────────────────────
export function ColumnBrowser({
  nodes,
  selectedNodeId,
  selectedIds,
  onSelectNode,
  onAddNode,
}: {
  nodes: MenuNodeWithMetadata[];
  selectedNodeId: string | null;
  selectedIds: Set<string>;
  onSelectNode: (id: string, mode?: "multi" | "range" | "longpress") => void;
  onAddNode: (parentId: string | null) => void;
}) {
  // columnPath: array of folder IDs that are "open" — drives which columns show
  const [columnPath, setColumnPath] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"above" | "below" | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);

  // Auto-scroll right when new column opens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [columnPath.length]);

  const handleLongPressNode = useCallback((node: MenuNodeWithMetadata) => {
    onSelectNode(node.id, "longpress");
  }, [onSelectNode]);

  const handleClickNode = useCallback((node: MenuNodeWithMetadata, e: React.MouseEvent) => {
    if (e.shiftKey) { onSelectNode(node.id, "range"); return; }
    if (e.metaKey || e.ctrlKey) { onSelectNode(node.id, "multi"); return; }
    if (selectedIds.size > 0) { onSelectNode(node.id, "multi"); return; }
    const nodeIsContainer = isContainerNode(node, nodes);
    onSelectNode(node.id);

    if (nodeIsContainer) {
      // Find where this node sits in the current path
      const indexInPath = columnPath.indexOf(node.id);
      if (indexInPath >= 0) {
        // Already in path — truncate everything after it
        setColumnPath(columnPath.slice(0, indexInPath + 1));
      } else {
        // Find which column this node belongs to (its parent is the last entry in some prefix of columnPath)
        const parentId = node.parentId;
        const parentIndexInPath = parentId ? columnPath.indexOf(parentId) : -1;

        if (parentIndexInPath >= 0) {
          // Parent is in path — replace everything after parent with this node
          setColumnPath([...columnPath.slice(0, parentIndexInPath + 1), node.id]);
        } else if (!parentId) {
          // Root node — reset to just this node
          setColumnPath([node.id]);
        } else {
          // Node is deeper; just append (shouldn't normally happen with proper navigation)
          setColumnPath([...columnPath, node.id]);
        }
      }
    } else {
      // Leaf node — don't change columns, just select it
      // Trim path to the node's parent depth so highlight is correct
      const parentId = node.parentId;
      if (parentId) {
        const parentIdx = columnPath.indexOf(parentId);
        if (parentIdx >= 0) {
          setColumnPath(columnPath.slice(0, parentIdx + 1));
        } else if (!columnPath.includes(parentId)) {
          // Parent not in path — keep current path unchanged
        }
      } else {
        // Root leaf — clear column path
        setColumnPath([]);
      }
    }
  }, [nodes, columnPath, onSelectNode]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    const dragIds = selectedIds.size > 1 && selectedIds.has(nodeId)
      ? Array.from(selectedIds)
      : [nodeId];
    e.dataTransfer.setData("application/x-node-ids", JSON.stringify(dragIds));
    e.dataTransfer.setData("text/plain", nodeId);
    setDragNodeId(nodeId);

    if (dragIds.length > 1) {
      const badge = document.createElement("div");
      badge.style.cssText = [
        "position:fixed;top:-999px;left:-999px",
        "display:flex;align-items:center;gap:6px",
        "background:#4f46e5;color:#fff;font:600 13px/1 system-ui",
        "padding:5px 10px 5px 8px;border-radius:999px",
        "box-shadow:0 2px 8px rgba(0,0,0,0.35)",
        "pointer-events:none;white-space:nowrap",
      ].join(";");
      badge.innerHTML = `<span style="background:rgba(255,255,255,0.25);border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px">${dragIds.length}</span><span>items</span>`;
      document.body.appendChild(badge);
      e.dataTransfer.setDragImage(badge, -12, badge.offsetHeight / 2);
      requestAnimationFrame(() => document.body.removeChild(badge));
    }
  }, [selectedIds]);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("text/plain") || dragNodeId;
    if (sourceId === nodeId) return;

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    const targetIsFolder = FOLDER_TYPES.has(targetNode.type) || nodes.some((n) => n.parentId === nodeId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;

    if (targetIsFolder && ratio > 0.25 && ratio < 0.75) {
      setDropFolderId(nodeId);
      setDragOverId(null);
      setDragOverPosition(null);
    } else {
      setDropFolderId(null);
      setDragOverId(nodeId);
      setDragOverPosition(ratio < 0.5 ? "above" : "below");
    }
  }, [nodes, dragNodeId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropFolderId(null);
      setDragOverId(null);
      setDragOverPosition(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDropFolderId = dropFolderId;
    const currentDragOverPosition = dragOverPosition;
    setDragOverId(null);
    setDropFolderId(null);
    setDragOverPosition(null);

    let dragIds: string[];
    try {
      dragIds = JSON.parse(e.dataTransfer.getData("application/x-node-ids"));
    } catch {
      const single = e.dataTransfer.getData("text/plain");
      dragIds = single ? [single] : [];
    }
    if (dragIds.length === 0 || (dragIds.length === 1 && dragIds[0] === targetId)) return;

    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode) return;

    if (currentDropFolderId === targetId) {
      // Drop INTO folder
      const targetChildren = nodes
        .filter((n) => n.parentId === targetId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      let nextSortOrder = targetChildren.length > 0
        ? targetChildren[targetChildren.length - 1].sortOrder + 1
        : 0;
      const toMove = dragIds.filter((id) => {
        const n = nodes.find((x) => x.id === id);
        return n && id !== targetId && n.parentId !== targetId;
      });
      await Promise.all(toMove.map((id) =>
        apiRequest("PATCH", `/api/nodes/${id}`, {
          parentId: targetId,
          sortOrder: nextSortOrder++,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    } else {
      // Sibling reorder
      const sourceId = dragIds[0];
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return;

      const targetParentId = targetNode.parentId;

      if (sourceNode.parentId === targetParentId) {
        const siblings = nodes
          .filter((n) => n.parentId === targetParentId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const orderedIds = siblings.map((n) => n.id);
        const fromIndex = orderedIds.indexOf(sourceId);
        let toIndex = orderedIds.indexOf(targetId);
        orderedIds.splice(fromIndex, 1);
        if (currentDragOverPosition === "below") toIndex = Math.min(toIndex + 1, orderedIds.length);
        if (fromIndex < toIndex) toIndex = Math.max(0, toIndex);
        orderedIds.splice(toIndex, 0, sourceId);
        const parentParam = targetParentId || "root";
        await apiRequest("POST", `/api/nodes/${parentParam}/reorder`, { orderedIds });
        queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      } else {
        // Cross-parent: move to target's parent at the right position
        const siblings = nodes
          .filter((n) => n.parentId === targetParentId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const orderedIds = siblings.map((n) => n.id);
        let toIndex = orderedIds.indexOf(targetId);
        if (currentDragOverPosition === "below") toIndex++;

        for (const id of dragIds) {
          await apiRequest("PATCH", `/api/nodes/${id}`, {
            parentId: targetParentId,
            sortOrder: 0,
          });
        }
        const newOrderedIds = [...orderedIds];
        for (const id of dragIds) {
          newOrderedIds.splice(toIndex, 0, id);
          toIndex++;
        }
        const parentParam = targetParentId || "root";
        await apiRequest("POST", `/api/nodes/${parentParam}/reorder`, { orderedIds: newOrderedIds });
        queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      }
    }
  }, [nodes, dropFolderId, dragOverPosition]);

  // Drop on column background → move to that column's parent (append to end)
  const handleDropOnBackground = useCallback(async (e: React.DragEvent, targetParentId: string | null) => {
    e.preventDefault();
    setDragOverId(null);
    setDropFolderId(null);

    let dragIds: string[];
    try {
      dragIds = JSON.parse(e.dataTransfer.getData("application/x-node-ids"));
    } catch {
      const single = e.dataTransfer.getData("text/plain");
      dragIds = single ? [single] : [];
    }
    if (dragIds.length === 0) return;

    const targetChildren = nodes
      .filter((n) => n.parentId === targetParentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    let nextSortOrder = targetChildren.length > 0
      ? targetChildren[targetChildren.length - 1].sortOrder + 1
      : 0;

    const toMove = dragIds.filter((id) => {
      const n = nodes.find((x) => x.id === id);
      return n && n.parentId !== targetParentId;
    });
    if (toMove.length === 0) return;

    await Promise.all(toMove.map((id) =>
      apiRequest("PATCH", `/api/nodes/${id}`, {
        parentId: targetParentId,
        sortOrder: nextSortOrder++,
      })
    ));
    queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
  }, [nodes]);

  // Build column list: [null (root), ...columnPath]
  const columnParents: (string | null)[] = [null, ...columnPath];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const dragState = { dragOverId, dragOverPosition, dropFolderId };

  const editorDefaultSize = getStoredColumnPanelSize(35);
  const columnsDefaultSize = 100 - editorDefaultSize;

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full"
      onLayout={(sizes) => { if (sizes[1]) storeColumnPanelSize(sizes[1]); }}
    >
      {/* Scrollable columns area */}
      <ResizablePanel defaultSize={columnsDefaultSize} minSize={30}>
        <div
          ref={scrollRef}
          className="flex h-full overflow-x-auto overflow-y-hidden"
          style={{ minWidth: 0 }}
        >
          {columnParents.map((parentId) => (
            <BrowserColumn
              key={parentId ?? "__root__"}
              parentId={parentId}
              nodes={nodes}
              columnPath={columnPath}
              selectedNodeId={selectedNodeId}
              selectedIds={selectedIds}
              onClickNode={handleClickNode}
              onLongPressNode={handleLongPressNode}
              onAddNode={onAddNode}
              dragState={dragState}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDropOnBackground={handleDropOnBackground}
            />
          ))}
          {/* Filler so the last column isn't flush against the editor */}
          <div className="w-4 shrink-0" />
        </div>
      </ResizablePanel>

      <ResizableHandle className="bg-border hover:bg-indigo-400 active:bg-indigo-500 transition-colors data-[resize-handle-active]:bg-indigo-500 w-[3px] after:w-2" />

      {/* Editor pane */}
      <ResizablePanel defaultSize={editorDefaultSize} minSize={20} maxSize={55}>
        <div className="h-full flex flex-col overflow-hidden">
          {selectedNode ? (
            <NodeEditor node={selectedNode} allNodes={nodes} onSelectNode={onSelectNode} onAddNode={onAddNode} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Select an item to edit it
                </p>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
