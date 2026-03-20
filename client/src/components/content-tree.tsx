import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
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

const TYPE_COLORS: Record<string, string> = {
  folder: "text-amber-400",
  song: "text-green-400",
  album: "text-purple-400",
  playlist: "text-blue-400",
  photo_album: "text-pink-400",
  video: "text-red-400",
  link: "text-cyan-400",
  text: "text-slate-400",
  settings: "text-gray-400",
  game: "text-orange-400",
  cover_flow_home: "text-indigo-400",
  cover_flow_music: "text-indigo-400",
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
  const colorClass = TYPE_COLORS[node.type] || "text-muted-foreground";
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
          "flex items-center gap-2 py-2 pr-3 cursor-pointer group transition-all duration-100",
          isSelected
            ? "bg-primary/10 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
            : "hover:bg-muted/40 text-foreground/75 hover:text-foreground",
          isDragOver && "bg-primary/10 border-t border-primary/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelectNode(node.id)}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node.id)}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />

        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            className="flex-shrink-0 p-0.5 -m-0.5 rounded hover:bg-muted/60 transition-colors"
            data-testid={`button-toggle-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        <Icon className={cn("h-4 w-4 flex-shrink-0", colorClass)} />

        <span className="truncate flex-1 text-sm font-medium">{node.title}</span>

        {/* Status dot */}
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
            isPublished ? "bg-green-400" : "bg-muted-foreground/30"
          )}
          title={isPublished ? "Published" : "Draft"}
        />

        {isFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddNode(node.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-muted/60"
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
    // Auto-expand root-level folders
    const rootFolders = nodes
      .filter((n) => !n.parentId)
      .map((n) => n.id);
    return new Set(rootFolders);
  });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.dataTransfer.setData("text/plain", nodeId);
      setDragNodeId(nodeId);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.preventDefault();
      setDragOverId(nodeId);
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);
      const sourceId = e.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === targetId) return;

      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!sourceNode || !targetNode) return;

      // Only reorder within the same parent
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
    },
    [nodes]
  );

  const rootNodes = nodes
    .filter((n) => !n.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="pb-2" data-testid="content-tree">
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
