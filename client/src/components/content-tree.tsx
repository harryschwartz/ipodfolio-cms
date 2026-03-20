import { useState, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

function hasChildren(nodeId: string, nodes: MenuNodeWithMetadata[]): boolean {
  return nodes.some((n) => n.parentId === nodeId);
}

function TreeNode({
  node,
  nodes,
  depth,
  selectedNodeId,
  onSelectNode,
  onAddNode,
  expandedIds,
  toggleExpanded,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
}: {
  node: MenuNodeWithMetadata;
  nodes: MenuNodeWithMetadata[];
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddNode: (parentId: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  dragOverId: string | null;
}) {
  const Icon = TYPE_ICONS[node.type] || FileText;
  const iconStyle = TYPE_ICON_STYLE[node.type] || "bg-gray-100 text-gray-500";
  const selectedBg = TYPE_SELECTED_BG[node.type] || "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]";
  const isExpanded = expandedIds.has(node.id);
  const isFolder = hasChildren(node.id, nodes) || ["folder", "album", "playlist"].includes(node.type);
  const isSelected = node.id === selectedNodeId;
  const isDragOver = node.id === dragOverId;
  const isPublished = node.status === "published";

  const children = nodes
    .filter((n) => n.parentId === node.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div data-testid={`tree-node-${node.id}`}>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 pr-3 cursor-pointer group transition-all duration-100 rounded-none",
          isSelected
            ? cn("text-foreground font-medium", selectedBg)
            : "text-foreground/70 hover:text-foreground hover:bg-muted/60",
          isDragOver && "bg-primary/10 border-t-2 border-primary/40"
        )}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
        onClick={() => onSelectNode(node.id)}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node.id)}
      >
        {/* Drag handle */}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/25 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />

        {/* Expand toggle */}
        {isFolder ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}
            className="flex-shrink-0 rounded hover:bg-black/5 p-0.5 -m-0.5 transition-colors"
            data-testid={`button-toggle-${node.id}`}
          >
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {/* Colored icon badge */}
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors", iconStyle)}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        {/* Title */}
        <span className="truncate flex-1 text-sm">{node.title}</span>

        {/* Live indicator dot */}
        {isPublished && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Published" />
        )}

        {/* Add child button */}
        {isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddNode(node.id); }}
            className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-black/8"
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
              onSelectNode={onSelectNode}
              onAddNode={onAddNode}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverId={dragOverId}
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
  onSelectNode,
  onAddNode,
}: {
  nodes: MenuNodeWithMetadata[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddNode: (parentId: string | null) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const rootFolders = nodes.filter((n) => !n.parentId).map((n) => n.id);
    return new Set(rootFolders);
  });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData("text/plain", nodeId);
    setDragNodeId(nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    setDragOverId(nodeId);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.parentId !== targetNode.parentId) return;

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
  }, [nodes]);

  const rootNodes = nodes.filter((n) => !n.parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div data-testid="content-tree">
      {rootNodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          nodes={nodes}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onAddNode={onAddNode}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverId={dragOverId}
        />
      ))}
    </div>
  );
}
