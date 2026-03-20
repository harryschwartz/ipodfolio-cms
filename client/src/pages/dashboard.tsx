import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, Plus } from "lucide-react";
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
      <rect x="7" y="4" width="10" height="6" rx="1" fill="hsl(var(--primary))" opacity="0.9" />
      <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
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
    if (isMobile && id) {
      setMobileView("editor");
    }
  };

  const handleBackToTree = () => {
    setMobileView("tree");
  };

  const handleAddNode = (parentId: string | null) => {
    setAddParentId(parentId);
    setAddDialogOpen(true);
  };

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background" data-testid="dashboard">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar shrink-0 shadow-sm">
          {mobileView === "editor" && selectedNode ? (
            <button
              onClick={handleBackToTree}
              className="flex items-center gap-1.5 text-sm text-primary font-medium"
              data-testid="button-back-to-tree"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <IpodIcon size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight">iPodfolio CMS</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">Content Manager</p>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-full"
            data-testid="button-preview-ipod"
            onClick={() => window.open("https://ipodfolio.vercel.app", "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </Button>
        </header>

        {/* Mobile Content */}
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

            {/* Mobile Footer */}
            <div className="p-3 border-t border-border bg-sidebar shrink-0">
              <Button
                size="default"
                className="w-full gap-2"
                data-testid="button-add-root-node"
                onClick={() => handleAddNode(null)}
              >
                <Plus className="h-4 w-4" />
                New Root Item
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedNode ? (
              <NodeEditor
                node={selectedNode}
                allNodes={nodes || []}
                onSelectNode={handleSelectNode}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <IpodIcon size={32} className="text-primary/60" />
                  </div>
                  <p className="text-sm font-medium">Select a node to edit</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Node Dialog */}
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
      <aside className="w-[300px] min-w-[300px] border-r border-border bg-sidebar flex flex-col shadow-lg">
        {/* Sidebar Header */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <IpodIcon size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">iPodfolio CMS</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Content Manager</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 rounded-full"
            data-testid="button-preview-ipod"
            onClick={() => window.open("https://ipodfolio.vercel.app", "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </Button>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Content
          </p>
        </div>

        {/* Content Tree */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="px-3 py-2 space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
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

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 h-9 text-sm"
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
          <NodeEditor
            node={selectedNode}
            allNodes={nodes || []}
            onSelectNode={handleSelectNode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-5 max-w-sm px-6">
              <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner">
                <IpodIcon size={48} className="text-primary/50" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Welcome to iPodfolio CMS</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select an item from the sidebar to start editing, or create new content to get started.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9"
                onClick={() => handleAddNode(null)}
              >
                <Plus className="h-4 w-4" />
                Create New Item
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Add Node Dialog */}
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
