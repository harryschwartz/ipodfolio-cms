import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, Plus, Sparkles } from "lucide-react";
import { ContentTree } from "@/components/content-tree";
import { NodeEditor } from "@/components/node-editor";
import { AddNodeDialog } from "@/components/add-node-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MenuNodeWithMetadata } from "@shared/schema";

type MobileView = "tree" | "editor";

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

function SidebarHeader({ onPreview }: { onPreview: () => void }) {
  return (
    <div className="shrink-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-4 pt-5 pb-4">
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Section label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
        Content
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("tree");
  const isMobile = useIsMobile();

  const { data: nodes, isLoading } = useQuery<MenuNodeWithMetadata[]>({
    queryKey: ["/api/nodes"],
  });

  const selectedNode = nodes?.find((n) => n.id === selectedNodeId);

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    if (isMobile && id) setMobileView("editor");
  };

  const handleAddNode = (parentId: string | null) => {
    setAddParentId(parentId);
    setAddDialogOpen(true);
  };

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background" data-testid="dashboard">
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
          <button
            onClick={() => window.open("https://ipodfolio.vercel.app", "_blank")}
            data-testid="button-preview-ipod"
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/15 rounded-full px-3 py-1.5 transition-all"
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </button>
        </header>

        {mobileView === "tree" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <ContentTree
                  nodes={nodes || []}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={handleSelectNode}
                  onAddNode={handleAddNode}
                />
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border bg-white/80 backdrop-blur-sm shrink-0">
              <Button size="default" className="w-full gap-2" data-testid="button-add-root-node" onClick={() => handleAddNode(null)}>
                <Plus className="h-4 w-4" />
                New Root Item
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedNode ? (
              <NodeEditor node={selectedNode} allNodes={nodes || []} onSelectNode={handleSelectNode} />
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
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ───
  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="dashboard">
      {/* Sidebar */}
      <aside className="w-[288px] min-w-[288px] border-r border-border bg-sidebar flex flex-col shadow-lg">
        <SidebarHeader onPreview={() => window.open("https://ipodfolio.vercel.app", "_blank")} />

        {/* Content Tree */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="px-3 py-3 space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="py-2">
              <ContentTree
                nodes={nodes || []}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onAddNode={handleAddNode}
              />
            </div>
          )}
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border bg-sidebar">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 h-9 text-sm font-medium"
            data-testid="button-add-root-node"
            onClick={() => handleAddNode(null)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Root Item
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {selectedNode ? (
          <NodeEditor node={selectedNode} allNodes={nodes || []} onSelectNode={handleSelectNode} />
        ) : (
          <EmptyState onAdd={() => handleAddNode(null)} />
        )}
      </main>

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
