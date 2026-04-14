import { useState, useCallback, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
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
  GripVertical,
  Plus,
  Globe,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MenuNodeWithMetadata } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AudioBadge } from "@/components/audio-badge";

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

// Icon badge: background + icon color per type
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

// Selected row tint per type
const TYPE_SELECTED_BG: Record<string, string> = {
  folder:          "bg-amber-50   shadow-[inset_3px_0_0_theme(colors.amber.400)]",
  song:            "bg-emerald-50 shadow-[inset_3px_0_0_theme(colors.emerald.400)]",
  album:           "bg-purple-50  shadow-[inset_3px_0_0_theme(colors.purple.400)]",
  playlist:        "bg-blue-50    shadow-[inset_3px_0_0_theme(colors.blue.400)]",
  photo_album:     "bg-pink-50    shadow-[inset_3px_0_0_theme(colors.pink.400)]",
  video:           "bg-red-50     shadow-[inset_3px_0_0_theme(colors.red.400)]",
  link:            "bg-cyan-50    shadow-[inset_3px_0_0_theme(colors.cyan.400)]",
  text:            "bg-slate-50   shadow-[inset_3px_0_0_theme(colors.slate.400)]",
  settings:        "bg-gray-50    shadow-[inset_3px_0_0_theme(colors.gray.400)]",
  game:            "bg-orange-50  shadow-[inset_3px_0_0_theme(colors.orange.400)]",
  cover_flow_home: "bg-indigo-50  shadow-[inset_3px_0_0_theme(colors.indigo.400)]",
  cover_flow_music:"bg-violet-50  shadow-[inset_3px_0_0_theme(colors.violet.400)]",
};

const FOLDER_TYPES = new Set(["folder", "album", "playlist", "photo_album"]);

// Display labels (singular → plural)
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
  const children = nodes.filter((n) => n.parentId === nodeId);
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

function isFolder(node: MenuNodeWithMetadata, nodes: MenuNodeWithMetadata[]): boolean {
  return FOLDER_TYPES.has(node.type) || nodes.some((n) => n.parentId === node.id);
}

/** Small cover art thumbnail or emoji fallback */
function CoverThumb({ node }: { node: MenuNodeWithMetadata }) {
  const meta = node.metadata as any;
  const coverUrl = meta?.coverImageUrl;
  const emoji = meta?.coverEmoji;
  const color = meta?.coverColor;

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt=""
        className="w-10 h-10 md:w-8 md:h-8 rounded-lg object-cover flex-shrink-0 border border-border/50"
      />
    );
  }

  if (emoji) {
    return (
      <div
        className="w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base md:text-sm border border-border/50"
        style={{ backgroundColor: color || "#f3f4f6" }}
      >
        {emoji}
      </div>
    );
  }

  return null;
}

/** Inline publish toggle */
function PublishDot({
  node,
  onClick,
}: {
  node: MenuNodeWithMetadata;
  onClick: (e: React.MouseEvent) => void;
}) {
  const isPublished = node.status === "published";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-1.5 py-1 rounded-full text-[10px] font-semibold transition-all flex-shrink-0",
        isPublished
          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
          : "text-muted-foreground bg-muted/50 hover:bg-muted"
      )}
      title={isPublished ? "Published — tap to unpublish" : "Draft — tap to publish"}
    >
      {isPublished ? (
        <Globe className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
    </button>
  );
}

function TreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  selectedIds,
  onSelectNode,
  onAddNode,
  expandedIds,
  toggleExpanded,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverId,
  dropFolderId,
  onTogglePublish,
}: {
  node: MenuNodeWithMetadata;
  nodes: MenuNodeWithMetadata[];
  depth: number;
  selectedNodeId: string | null;
  selectedIds: Set<string>;
  onSelectNode: (id: string, mode?: "multi" | "range" | "longpress") => void;
  onAddNode: (parentId: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  dragOverId: string | null;
  dropFolderId: string | null;
  onTogglePublish: (node: MenuNodeWithMetadata) => void;
}) {
  const Icon = TYPE_ICONS[node.type] || FileText;
  const iconStyle = TYPE_ICON_STYLE[node.type] || "bg-gray-100 text-gray-500";
  const selectedBg = TYPE_SELECTED_BG[node.type] || "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]";
  const isExpanded = expandedIds.has(node.id);
  const nodeIsFolder = isFolder(node, nodes);
  const isSelected = node.id === selectedNodeId || selectedIds.has(node.id);
  const isMultiSelected = selectedIds.has(node.id);
  const isSiblingDragOver = node.id === dragOverId;
  const isFolderDropTarget = node.id === dropFolderId;
  const isMobile = useIsMobile();
  const hasCover = (node.metadata as any)?.coverImageUrl || (node.metadata as any)?.coverEmoji;

  // Long-press for mobile multi-select (increased threshold for reliability)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const handleTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onSelectNode(node.id, "longpress");
    }, 600);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const children = nodes
    .filter((n) => n.parentId === node.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div data-testid={`tree-node-${node.id}`}>
      <div
        className={cn(
          // Bigger rows: py-3 on mobile, py-1.5 on desktop
          "flex items-center gap-2.5 py-3 md:py-1.5 pr-3 cursor-pointer group transition-all duration-100 rounded-none",
          isSelected
            ? cn("text-foreground font-medium", selectedBg)
            : "text-foreground/70 hover:text-foreground hover:bg-muted/60",
          isMultiSelected && "bg-indigo-50 shadow-[inset_3px_0_0_theme(colors.indigo.400)] text-foreground font-medium",
          isSiblingDragOver && "border-t-2 border-primary/60",
          isFolderDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/40"
        )}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
        onClick={(e) => {
          if (didLongPress.current) { didLongPress.current = false; return; }
          if (e.shiftKey) onSelectNode(node.id, "range");
          else if (e.metaKey || e.ctrlKey) onSelectNode(node.id, "multi");
          // On mobile, if in multi-select mode, stay in multi-select;
          // otherwise always navigate directly to the editor
          else if (!isMobile && selectedIds.size > 0) onSelectNode(node.id, "multi");
          else onSelectNode(node.id);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.id)}
      >
        {/* Drag handle / checkbox */}
        {isMultiSelected ? (
          <div className="h-5 w-5 md:h-3.5 md:w-3.5 flex-shrink-0 rounded-sm bg-indigo-500 flex items-center justify-center">
            <svg className="h-3 w-3 md:h-2.5 md:w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        ) : selectedIds.size > 0 ? (
          <div className="h-5 w-5 md:h-3.5 md:w-3.5 flex-shrink-0 rounded-sm border-2 border-muted-foreground/25 hover:border-indigo-400 transition-colors" />
        ) : (
          <GripVertical className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground/25 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
        )}

        {/* Expand toggle */}
        {nodeIsFolder ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}
            className="flex-shrink-0 rounded hover:bg-black/5 p-0.5 -m-0.5 transition-colors"
            data-testid={`button-toggle-${node.id}`}
          >
            {isExpanded
              ? <ChevronDown className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-4 md:w-3.5 flex-shrink-0" />
        )}

        {/* Cover art thumbnail (if available) or type icon badge */}
        {hasCover ? (
          <CoverThumb node={node} />
        ) : (
          <div className={cn("w-10 h-10 md:w-6 md:h-6 rounded-lg md:rounded-md flex items-center justify-center flex-shrink-0 transition-colors", iconStyle)}>
            <Icon className="h-5 w-5 md:h-3.5 md:w-3.5" />
          </div>
        )}

        {/* Title + type subtitle + children summary */}
        <div className="flex-1 min-w-0">
          <span className="truncate block text-sm md:text-sm font-medium">{node.title}</span>
          {isMobile && (
            <span className="truncate block text-[11px] text-muted-foreground capitalize">
              {node.type.replace(/_/g, " ")}
            </span>
          )}
          {nodeIsFolder && (() => {
            const summary = getChildrenSummary(node.id, nodes);
            return summary ? (
              <span className="truncate block text-[11px] text-muted-foreground/70">
                {summary}
              </span>
            ) : null;
          })()}
        </div>

        {/* Audio recording indicator */}
        {(node.metadata as any)?.audioUrl && (
          <AudioBadge
            audioUrl={(node.metadata as any).audioUrl}
            duration={(node.metadata as any)?.duration}
          />
        )}

        {/* Publish toggle button */}
        <PublishDot
          node={node}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePublish(node);
          }}
        />

        {/* Add child button (desktop hover only) */}
        {nodeIsFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddNode(node.id); }}
            className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-black/8 hidden md:block"
            data-testid={`button-add-child-${node.id}`}
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              nodes={nodes}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              selectedIds={selectedIds}
              onSelectNode={onSelectNode}
              onAddNode={onAddNode}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dragOverId={dragOverId}
              dropFolderId={dropFolderId}
              onTogglePublish={onTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentTree({
  nodes,
  selectedNodeId,
  selectedIds,
  onSelectNode,
  onAddNode,
  searchQuery = "",
}: {
  nodes: MenuNodeWithMetadata[];
  selectedNodeId: string | null;
  selectedIds: Set<string>;
  onSelectNode: (id: string, mode?: "multi" | "range" | "longpress") => void;
  onAddNode: (parentId: string | null) => void;
  searchQuery?: string;
}) {
  const isSearching = searchQuery.trim().length > 0;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const rootFolders = nodes.filter((n) => !n.parentId).map((n) => n.id);
    return new Set(rootFolders);
  });

  // Auto-expand all nodes when searching
  const effectiveExpanded = isSearching
    ? new Set(nodes.map((n) => n.id))
    : expandedIds;
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleTogglePublish = useCallback(async (node: MenuNodeWithMetadata) => {
    const endpoint = node.status === "published" ? "unpublish" : "publish";
    await apiRequest("POST", `/api/nodes/${node.id}/${endpoint}`);
    queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    // If dragging a multi-selected item, carry all selected IDs
    const dragIds = selectedIds.size > 1 && selectedIds.has(nodeId)
      ? Array.from(selectedIds)
      : [nodeId];
    e.dataTransfer.setData("application/x-node-ids", JSON.stringify(dragIds));
    e.dataTransfer.setData("text/plain", nodeId);
    setDragNodeId(nodeId);

    // Custom drag image: count badge
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
    const sourceId = e.dataTransfer.getData("text/plain") || dragNodeId;
    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!sourceNode || !targetNode || sourceId === nodeId) return;

    const targetIsFolder = FOLDER_TYPES.has(targetNode.type) || nodes.some((n) => n.parentId === nodeId);
    const crossParent = sourceNode.parentId !== targetNode.parentId;

    if (targetIsFolder && crossParent) {
      setDropFolderId(nodeId);
      setDragOverId(null);
    } else if (!crossParent) {
      setDragOverId(nodeId);
      setDropFolderId(null);
    } else {
      setDragOverId(nodeId);
      setDropFolderId(null);
    }
  }, [nodes, dragNodeId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropFolderId(null);
      setDragOverId(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
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
    if (dragIds.length === 0 || (dragIds.length === 1 && dragIds[0] === targetId)) return;

    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode) return;

    const targetIsFolder = FOLDER_TYPES.has(targetNode.type) || nodes.some((n) => n.parentId === targetId);

    if (targetIsFolder) {
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
      setExpandedIds((prev) => new Set([...prev, targetId]));
    } else if (dragIds.length === 1) {
      const sourceId = dragIds[0];
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode || sourceNode.parentId !== targetNode.parentId) return;

      const siblings = nodes
        .filter((n) => n.parentId === sourceNode.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const orderedIds = siblings.map((n) => n.id);
      const fromIndex = orderedIds.indexOf(sourceId);
      const toIndex = orderedIds.indexOf(targetId);
      orderedIds.splice(fromIndex, 1);
      orderedIds.splice(toIndex, 0, sourceId);

      const parentParam = sourceNode.parentId || "root";
      await apiRequest("POST", `/api/nodes/${parentParam}/reorder`, { orderedIds });
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    }
  }, [nodes]);

  const rootNodes = nodes.filter((n) => !n.parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div data-testid="content-tree" className="py-1">
      {rootNodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          nodes={nodes}
          depth={0}
          selectedNodeId={selectedNodeId}
          selectedIds={selectedIds}
          onSelectNode={onSelectNode}
          onAddNode={onAddNode}
          expandedIds={effectiveExpanded}
          toggleExpanded={toggleExpanded}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverId={dragOverId}
          dropFolderId={dropFolderId}
          onTogglePublish={handleTogglePublish}
        />
      ))}
    </div>
  );
}
