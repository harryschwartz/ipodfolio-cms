import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, List } from "lucide-react";
import { ContentTree } from "@/components/content-tree";
import { NodeEditor } from "@/components/node-editor";
import { AddNodeDialog } from "@/components/add-node-dialog";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MenuNodeWithMetadata } from "@shared/schema";

type MobileView = "tree" | "editor";

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

  // When a node is selected on mobile, auto-switch to editor view
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
      <div className="flex flex-col h-screen overflow-hidden" data-testid="dashboard">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar shrink-0">
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
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="iPodfolio CMS"
              >
                <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="7" y="4" width="10" height="6" rx="1" fill="hsl(var(--primary))" opacity="0.8" />
                <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="16" r="1.2" fill="currentColor" />
              </svg>
              <h1 className="text-sm font-semibold tracking-tight">iPodfolio CMS</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground"
            data-testid="button-preview-ipod"
            onClick={() => window.open("https://ipodfolio.vercel.app", "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview
          </Button>
        </header>

        {/* Mobile Content */}
        {mobileView === "tree" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
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
                className="w-full text-sm"
                data-testid="button-add-root-node"
                onClick={() => handleAddNode(null)}
              >
                + Add Root Node
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
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                <p className="text-sm">Select a node to edit</p>
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
    <div className="flex h-screen overflow-hidden" data-testid="dashboard">
      {/* Sidebar */}
      <aside className="w-[300px] min-w-[300px] border-r border-border bg-sidebar flex flex-col">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="iPodfolio CMS"
            >
              <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <rect x="7" y="4" width="10" height="6" rx="1" fill="hsl(var(--primary))" opacity="0.8" />
              <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" />
            </svg>
            <h1 className="text-sm font-semibold tracking-tight">iPodfolio CMS</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            data-testid="button-preview-ipod"
            onClick={() => window.open("https://ipodfolio.vercel.app", "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </Button>
        </div>

        {/* Content Tree */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
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
        <div className="p-2 border-t border-border">
          <Button
            size="sm"
            className="w-full text-xs"
            data-testid="button-add-root-node"
            onClick={() => handleAddNode(null)}
          >
            + Add Root Node
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedNode ? (
          <NodeEditor
            node={selectedNode}
            allNodes={nodes || []}
            onSelectNode={handleSelectNode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto opacity-30"
              >
                <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="7" y="4" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <circle cx="12" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="16" r="1.2" fill="currentColor" />
              </svg>
              <p className="text-sm">Select a node to edit</p>
              <p className="text-xs text-muted-foreground/60">
                Or click "Add Root Node" to create new content
              </p>
            </div>
          </div>
        )}
        <div className="border-t border-border p-2 text-center">
          <PerplexityAttribution />
        </div>
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
