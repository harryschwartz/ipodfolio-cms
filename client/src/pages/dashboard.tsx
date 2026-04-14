import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, ChevronRight, Plus, Sparkles, List, Columns2, Trash2, Globe, EyeOff, FolderInput, CornerDownRight, Folder, Disc3, ListMusic, Image, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContentTree } from "@/components/content-tree";
import { NodeEditor } from "@/components/node-editor";
import { AddNodeDialog } from "@/components/add-node-dialog";
import { ColumnBrowser } from "@/components/column-browser";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MenuNodeWithMetadata } from "@shared/schema";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

type MobileView = "tree" | "editor";
type ViewMode = "list" | "column";

function getStoredViewMode(): ViewMode {
  try {
    const v = localStorage.getItem("cms-view-mode");
    if (v === "list" || v === "column") return v;
  } catch {}
  return "list";
}

const LIST_PANEL_KEY = "cms-list-panel-size";
const COLUMN_PANEL_KEY = "cms-column-panel-size";

function getStoredPanelSize(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v) {
      const n = parseFloat(v);
      if (isFinite(n) && n > 0 && n < 100) return n;
    }
  } catch {}
  return fallback;
}

function storePanelSize(key: string, size: number) {
  try { localStorage.setItem(key, String(size)); } catch {}
}

function IpodIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="iPodfolio CMS"
      className={className}
    >
      <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="4" width="10" height="6" rx="1" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center bg-white/15 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onChange("list")}
        title="List view"
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-all",
          viewMode === "list"
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-white/70 hover:text-white hover:bg-white/10"
        )}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange("column")}
        title="Column view"
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-all",
          viewMode === "column"
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-white/70 hover:text-white hover:bg-white/10"
        )}
      >
        <Columns2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SearchBar({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search content…"
        className="pl-9 pr-8 h-9 text-sm bg-muted/40 border-border/50 rounded-xl focus-visible:ring-indigo-500/30"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SidebarHeader({
  onPreview,
  viewMode,
  onViewModeChange,
}: {
  onPreview: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}) {
  return (
    <div className="shrink-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-4 pt-5 pb-4">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <IpodIcon size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white tracking-tight">iPodfolio</h1>
            <p className="text-[10px] text-white/65 leading-tight font-medium uppercase tracking-wider">CMS</p>
          </div>
        </div>
        <button
          onClick={onPreview}
          data-testid="button-preview-ipod"
          className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 transition-all font-medium"
        >
          <ExternalLink className="h-3 w-3" />
          Preview
        </button>
      </div>

      {/* Second row: view toggle + section label */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
          Content
        </p>
        <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
}

// Top bar used in column view (replaces sidebar header)
function ColumnTopBar({
  onPreview,
  viewMode,
  onViewModeChange,
  onAddNode,
  searchQuery,
  onSearchChange,
}: {
  onPreview: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onAddNode: () => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-4 py-3 flex items-center gap-3 shadow-md">
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
          <IpodIcon size={15} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-white tracking-tight">iPodfolio CMS</h1>
        </div>
      </div>

      {/* Inline search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-8 h-8 text-sm bg-white/15 text-white placeholder:text-white/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />

      <Button
        data-testid="button-add-root-node"
        onClick={onAddNode}
        size="sm"
        className="gap-1.5 h-8 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border-0 shadow-sm transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </Button>

      <button
        onClick={onPreview}
        data-testid="button-preview-ipod"
        className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 transition-all font-medium"
      >
        <ExternalLink className="h-3 w-3" />
        Preview
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("tree");
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const lastSelectedIdRef = useRef<string | null>(null);

  const { data: nodes, isLoading } = useQuery<MenuNodeWithMetadata[]>({
    queryKey: ["/api/nodes"],
  });

  const selectedNode = nodes?.find((n) => n.id === selectedNodeId);

  // Search filtering: match title, artist, album, type
  const filteredNodes = useMemo(() => {
    if (!nodes || !searchQuery.trim()) return nodes || [];
    const q = searchQuery.toLowerCase().trim();
    // Find all nodes that match the query
    const matchIds = new Set<string>();
    for (const n of nodes) {
      const meta = n.metadata as any;
      const haystack = [
        n.title,
        meta?.artistName,
        meta?.albumName,
        n.type,
      ].filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) matchIds.add(n.id);
    }
    // Also include ancestor nodes so tree structure stays intact
    const withAncestors = new Set(matchIds);
    for (const id of matchIds) {
      let cur = nodes.find((n) => n.id === id)?.parentId;
      while (cur) {
        withAncestors.add(cur);
        cur = nodes.find((n) => n.id === cur)?.parentId;
      }
    }
    return nodes.filter((n) => withAncestors.has(n.id));
  }, [nodes, searchQuery]);

  // Returns a flat list of all visible node IDs in display order (for range selection)
  const getVisibleIds = useCallback((): string[] => {
    if (!nodes) return [];
    const result: string[] = [];
    const visit = (parentId: string | null) => {
      const children = nodes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const n of children) {
        result.push(n.id);
        visit(n.id);
      }
    };
    visit(null);
    return result;
  }, [nodes]);

  const handleSelectNode = useCallback((id: string, mode?: "multi" | "range" | "longpress") => {
    if (mode === "multi" || mode === "longpress") {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        if (next.size > 0) lastSelectedIdRef.current = id;
        return next;
      });
      setSelectedNodeId(null);
    } else if (mode === "range") {
      const visibleIds = getVisibleIds();
      const anchor = lastSelectedIdRef.current;
      if (!anchor || anchor === id) {
        // No anchor yet — just toggle
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      } else {
        const anchorIdx = visibleIds.indexOf(anchor);
        const clickIdx = visibleIds.indexOf(id);
        if (anchorIdx === -1 || clickIdx === -1) return;
        const [from, to] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
        const rangeIds = visibleIds.slice(from, to + 1);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((rid) => next.add(rid));
          return next;
        });
      }
      setSelectedNodeId(null);
    } else {
      // Normal click — clear multi-select, select single
      setSelectedIds(new Set());
      lastSelectedIdRef.current = id;
      setSelectedNodeId(id);
      if (isMobile) setMobileView(id ? "editor" : "tree");
    }
  }, [getVisibleIds, isMobile]);

  const clearSelection = () => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  };

  const handleAddNode = (parentId: string | null) => {
    setAddParentId(parentId);
    setAddDialogOpen(true);
  };

  const handleViewModeChange = (v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem("cms-view-mode", v); } catch {}
  };

  // ─── BULK ACTIONS ───
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/nodes/${id}`)));
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      clearSelection();
      if (ids.includes(selectedNodeId ?? "")) setSelectedNodeId(null);
      toast({ title: `Deleted ${ids.length} item${ids.length > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const bulkSetStatus = async (status: "published" | "draft") => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) =>
        apiRequest("POST", `/api/nodes/${id}/${status === "published" ? "publish" : "unpublish"}`)
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      clearSelection();
      toast({ title: `${status === "published" ? "Published" : "Unpublished"} ${ids.length} item${ids.length > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const bulkMove = async (targetParentId: string | null) => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) =>
        apiRequest("PATCH", `/api/nodes/${id}`, { parentId: targetParentId })
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      clearSelection();
      setMoveDialogOpen(false);
      toast({ title: `Moved ${ids.length} item${ids.length > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Move failed", variant: "destructive" });
    }
  };

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-background" data-testid="dashboard">
        <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-gradient-to-r from-indigo-500 to-violet-600 shrink-0">
          {mobileView === "editor" && selectedNode ? (
            <button
              onClick={() => setMobileView("tree")}
              className="flex items-center gap-1.5 text-sm text-white font-medium"
              data-testid="button-back-to-tree"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <IpodIcon size={15} className="text-white" />
              </div>
              <h1 className="text-sm font-bold text-white">iPodfolio CMS</h1>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              data-testid="button-add-root-node"
              onClick={() => handleAddNode(null)}
              className="w-8 h-8 rounded-full bg-white text-indigo-600 hover:bg-white/90 flex items-center justify-center shadow-md transition-all active:scale-95"
              aria-label="New Collection"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.open("https://ipodfolio.vercel.app?preview=true", "_blank")}
              data-testid="button-preview-ipod"
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/15 rounded-full px-3 py-1.5 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Preview
            </button>
          </div>
        </header>

        {mobileView === "tree" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-1 shrink-0">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredNodes.length === 0 && searchQuery.trim() ? (
                <div className="px-4 py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <ContentTree
                  nodes={filteredNodes}
                  selectedNodeId={selectedNodeId}
                  selectedIds={selectedIds}
                  onSelectNode={handleSelectNode}
                  onAddNode={handleAddNode}
                  searchQuery={searchQuery}
                />
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {selectedNode ? (
              <NodeEditor node={selectedNode} allNodes={nodes || []} onSelectNode={handleSelectNode} onAddNode={handleAddNode} />
            ) : (
              <EmptyState onAdd={() => handleAddNode(null)} />
            )}
          </div>
        )}

        <AddNodeDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          parentId={addParentId}
          allNodes={nodes || []}
          onNodeCreated={(id) => {
            setSelectedNodeId(id);
            setAddDialogOpen(false);
            setMobileView("editor");
          }}
        />

        <BulkActionBar
          selectedIds={selectedIds}
          onClear={clearSelection}
          onDelete={bulkDelete}
          onPublish={() => bulkSetStatus("published")}
          onUnpublish={() => bulkSetStatus("draft")}
          onMove={() => setMoveDialogOpen(true)}
        />

        <MoveDialog
          open={moveDialogOpen}
          onClose={() => setMoveDialogOpen(false)}
          nodes={nodes || []}
          selectedIds={selectedIds}
          onMove={bulkMove}
        />
      </div>
    );
  }

  // ─── DESKTOP — COLUMN VIEW ───
  if (viewMode === "column") {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background" data-testid="dashboard">
        <ColumnTopBar
          onPreview={() => window.open("https://ipodfolio.vercel.app?preview=true", "_blank")}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddNode={() => handleAddNode(null)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex gap-px h-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-52 border-r border-border p-3 space-y-1.5">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-9 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <ColumnBrowser
              nodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              selectedIds={selectedIds}
              onSelectNode={handleSelectNode}
              onAddNode={handleAddNode}
            />
          )}
        </div>

        <AddNodeDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          parentId={addParentId}
          allNodes={nodes || []}
          onNodeCreated={(id) => {
            setSelectedNodeId(id);
            setAddDialogOpen(false);
          }}
        />

        <BulkActionBar
          selectedIds={selectedIds}
          onClear={clearSelection}
          onDelete={bulkDelete}
          onPublish={() => bulkSetStatus("published")}
          onUnpublish={() => bulkSetStatus("draft")}
          onMove={() => setMoveDialogOpen(true)}
        />

        <MoveDialog
          open={moveDialogOpen}
          onClose={() => setMoveDialogOpen(false)}
          nodes={nodes || []}
          selectedIds={selectedIds}
          onMove={bulkMove}
        />
      </div>
    );
  }

  // ─── DESKTOP — LIST VIEW ───
  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="dashboard">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes) => { if (sizes[0]) storePanelSize(LIST_PANEL_KEY, sizes[0]); }}
      >
        {/* Sidebar */}
        <ResizablePanel
          defaultSize={getStoredPanelSize(LIST_PANEL_KEY, 22)}
          minSize={15}
          maxSize={45}
        >
          <aside className="h-full bg-sidebar flex flex-col shadow-lg">
            <SidebarHeader
              onPreview={() => window.open("https://ipodfolio.vercel.app?preview=true", "_blank")}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            {/* Add + Search */}
            <div className="px-3 pt-3 pb-1 shrink-0 space-y-2">
              <Button
                data-testid="button-add-root-node"
                onClick={() => handleAddNode(null)}
                className="w-full gap-2 h-9 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0 shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                New Collection
              </Button>
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            {/* Content Tree */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="px-3 py-3 space-y-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredNodes.length === 0 && searchQuery.trim() ? (
                <div className="px-4 py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="py-2">
                  <ContentTree
                    nodes={filteredNodes}
                    selectedNodeId={selectedNodeId}
                    selectedIds={selectedIds}
                    onSelectNode={handleSelectNode}
                    onAddNode={handleAddNode}
                    searchQuery={searchQuery}
                  />
                </div>
              )}
            </ScrollArea>
          </aside>
        </ResizablePanel>

        <ResizableHandle className="bg-border hover:bg-indigo-400 active:bg-indigo-500 transition-colors data-[resize-handle-active]:bg-indigo-500 w-[3px] after:w-2" />

        {/* Main Area */}
        <ResizablePanel defaultSize={getStoredPanelSize(LIST_PANEL_KEY, 22) > 0 ? 100 - getStoredPanelSize(LIST_PANEL_KEY, 22) : 78} minSize={35}>
          <main className="h-full flex flex-col overflow-hidden bg-background">
            {selectedNode ? (
              <NodeEditor node={selectedNode} allNodes={nodes || []} onSelectNode={handleSelectNode} onAddNode={handleAddNode} />
            ) : (
              <EmptyState onAdd={() => handleAddNode(null)} />
            )}
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>

      <AddNodeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        parentId={addParentId}
        allNodes={nodes || []}
        onNodeCreated={(id) => {
          setSelectedNodeId(id);
          setAddDialogOpen(false);
        }}
      />

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearSelection}
        onDelete={bulkDelete}
        onPublish={() => bulkSetStatus("published")}
        onUnpublish={() => bulkSetStatus("draft")}
        onMove={() => setMoveDialogOpen(true)}
      />

      <MoveDialog
        open={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        nodes={nodes || []}
        selectedIds={selectedIds}
        onMove={bulkMove}
      />
    </div>
  );
}

function BulkActionBar({
  selectedIds, onClear, onDelete, onPublish, onUnpublish, onMove,
}: {
  selectedIds: Set<string>;
  onClear: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onMove: () => void;
}) {
  const count = selectedIds.size;
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-4 py-2.5 shadow-2xl border border-white/10">
      <span className="text-sm font-semibold mr-1">{count} selected</span>
      <div className="w-px h-4 bg-white/20" />
      <button onClick={onPublish} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-emerald-400 hover:text-emerald-300">
        <Globe className="h-3.5 w-3.5" />Publish
      </button>
      <button onClick={onUnpublish} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-yellow-400 hover:text-yellow-300">
        <EyeOff className="h-3.5 w-3.5" />Unpublish
      </button>
      <button onClick={onMove} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-400 hover:text-blue-300">
        <FolderInput className="h-3.5 w-3.5" />Move
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-300">
        <Trash2 className="h-3.5 w-3.5" />Delete
      </button>
      <div className="w-px h-4 bg-white/20" />
      <button onClick={onClear} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const MOVE_FOLDER_TYPES = new Set(["folder", "album", "playlist", "photo_album"]);
const MOVE_TYPE_ICONS: Record<string, any> = {
  folder: Folder, album: Disc3, playlist: ListMusic, photo_album: Image,
};
const MOVE_TYPE_ICON_BG: Record<string, string> = {
  folder: "bg-amber-100 text-amber-600", album: "bg-purple-100 text-purple-600",
  playlist: "bg-blue-100 text-blue-600", photo_album: "bg-pink-100 text-pink-600",
};

function MoveDialog({
  open, onClose, nodes, selectedIds, onMove,
}: {
  open: boolean;
  onClose: () => void;
  nodes: MenuNodeWithMetadata[];
  selectedIds: Set<string>;
  onMove: (parentId: string | null) => void;
}) {
  const [browsingId, setBrowsingId] = useState<string | null>(null);
  // undefined = nothing selected yet, null = top level, string = folder id
  const [selectedTarget, setSelectedTarget] = useState<string | null | undefined>(undefined);

  if (!open) return null;

  const currentChildren = nodes
    .filter((n) => n.parentId === browsingId && MOVE_FOLDER_TYPES.has(n.type) && !selectedIds.has(n.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Build breadcrumb
  const breadcrumb: MenuNodeWithMetadata[] = [];
  let cur: string | null = browsingId;
  while (cur) {
    const node = nodes.find((n) => n.id === cur);
    if (!node) break;
    breadcrumb.unshift(node);
    cur = node.parentId;
  }

  const handleMove = () => {
    if (selectedTarget === undefined) return;
    onMove(selectedTarget);
    setBrowsingId(null);
    setSelectedTarget(undefined);
  };

  const handleClose = () => {
    onClose();
    setBrowsingId(null);
    setSelectedTarget(undefined);
  };

  const getLabel = (id: string | null) => {
    if (id === null) return "Top level";
    return nodes.find((n) => n.id === id)?.title || "Unknown";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-[340px] max-h-[65vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Move to…</h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-1 text-xs text-muted-foreground flex-wrap">
          <button onClick={() => setBrowsingId(null)} className={cn("font-medium transition-colors", browsingId === null ? "text-foreground" : "hover:text-foreground")}>
            Root
          </button>
          {breadcrumb.map((node) => (
            <span key={node.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 opacity-40" />
              <button onClick={() => setBrowsingId(node.id)} className={cn("font-medium transition-colors", browsingId === node.id ? "text-foreground" : "hover:text-foreground")}>
                {node.title}
              </button>
            </span>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2">
          {/* Place here */}
          <button
            onClick={() => setSelectedTarget(browsingId)}
            className={cn(
              "w-full text-left px-4 py-3 text-sm rounded-xl transition-all flex items-center gap-3 mb-1",
              selectedTarget === browsingId
                ? "bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold"
                : "hover:bg-muted border border-transparent text-muted-foreground"
            )}
          >
            <CornerDownRight className="h-4 w-4 flex-shrink-0" />
            Place here{browsingId ? "" : " (top level)"}
          </button>

          {/* Drillable folders */}
          {currentChildren.map((node) => {
            const Icon = MOVE_TYPE_ICONS[node.type] || Folder;
            const iconBg = MOVE_TYPE_ICON_BG[node.type] || "bg-gray-100 text-gray-500";
            const meta = node.metadata as any;
            const coverUrl = meta?.coverImageUrl;
            return (
              <div key={node.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setBrowsingId(node.id)}>
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-border/50" />
                  ) : (
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{node.title}</span>
                </button>
                <button
                  onClick={() => setSelectedTarget(node.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0",
                    selectedTarget === node.id
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700 font-semibold"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {selectedTarget === node.id ? "Selected" : "Select"}
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" onClick={() => setBrowsingId(node.id)} />
              </div>
            );
          })}

          {currentChildren.length === 0 && browsingId !== null && (
            <p className="text-xs text-muted-foreground text-center py-4">No sub-folders here</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground truncate">
            {selectedTarget !== undefined
              ? <>Moving to: <span className="font-semibold text-foreground">{getLabel(selectedTarget)}</span></>
              : "Select a destination"}
          </p>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={selectedTarget === undefined}
            className="px-5 bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
          >
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        {/* Decorative gradient blob */}
        <div className="relative mx-auto mb-6 w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-200 via-violet-200 to-purple-200 blur-2xl opacity-80" />
          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200/50 flex items-center justify-center shadow-sm">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" className="text-indigo-500">
              <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <rect x="7" y="4" width="10" height="6" rx="1" fill="currentColor" opacity="0.3" />
              <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          Your iPodfolio awaits ✨
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Pick something from the sidebar to edit, or create your first piece of content and bring your portfolio to life.
        </p>

        <Button
          onClick={onAdd}
          className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 border-0 shadow-md hover:shadow-lg transition-all"
        >
          <Sparkles className="h-4 w-4" />
          Create Something
        </Button>
      </div>
    </div>
  );
}
