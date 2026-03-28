import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Folder,
  Music,
  Disc3,
  ListMusic,
  Image,
  Video,
  Link2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";

const NODE_TYPES = [
  {
    type: "folder",
    label: "Folder",
    description: "Group content together",
    icon: Folder,
    gradient: "from-amber-400 to-orange-400",
    iconBg: "bg-amber-100 text-amber-600",
    hoverBg: "hover:bg-amber-50 hover:border-amber-200",
    selectedBg: "bg-amber-50 border-amber-300",
  },
  {
    type: "song",
    label: "Song",
    description: "Audio track with metadata",
    icon: Music,
    gradient: "from-emerald-400 to-green-500",
    iconBg: "bg-emerald-100 text-emerald-600",
    hoverBg: "hover:bg-emerald-50 hover:border-emerald-200",
    selectedBg: "bg-emerald-50 border-emerald-300",
  },
  {
    type: "album",
    label: "Album",
    description: "Music album with cover art",
    icon: Disc3,
    gradient: "from-purple-400 to-violet-500",
    iconBg: "bg-purple-100 text-purple-600",
    hoverBg: "hover:bg-purple-50 hover:border-purple-200",
    selectedBg: "bg-purple-50 border-purple-300",
  },
  {
    type: "playlist",
    label: "Playlist",
    description: "Curated song collection",
    icon: ListMusic,
    gradient: "from-blue-400 to-cyan-500",
    iconBg: "bg-blue-100 text-blue-600",
    hoverBg: "hover:bg-blue-50 hover:border-blue-200",
    selectedBg: "bg-blue-50 border-blue-300",
  },
  {
    type: "photo_album",
    label: "Photos",
    description: "Photo gallery",
    icon: Image,
    gradient: "from-pink-400 to-rose-500",
    iconBg: "bg-pink-100 text-pink-600",
    hoverBg: "hover:bg-pink-50 hover:border-pink-200",
    selectedBg: "bg-pink-50 border-pink-300",
  },
  {
    type: "video",
    label: "Video",
    description: "Video with thumbnail",
    icon: Video,
    gradient: "from-red-400 to-orange-500",
    iconBg: "bg-red-100 text-red-600",
    hoverBg: "hover:bg-red-50 hover:border-red-200",
    selectedBg: "bg-red-50 border-red-300",
  },
  {
    type: "link",
    label: "Link",
    description: "External URL",
    icon: Link2,
    gradient: "from-cyan-400 to-blue-500",
    iconBg: "bg-cyan-100 text-cyan-600",
    hoverBg: "hover:bg-cyan-50 hover:border-cyan-200",
    selectedBg: "bg-cyan-50 border-cyan-300",
  },
  {
    type: "text",
    label: "Text",
    description: "Rich text content",
    icon: FileText,
    gradient: "from-slate-400 to-gray-500",
    iconBg: "bg-slate-100 text-slate-600",
    hoverBg: "hover:bg-slate-50 hover:border-slate-200",
    selectedBg: "bg-slate-50 border-slate-300",
  },
];

const FOLDER_TYPES = new Set(["folder", "album", "playlist", "photo_album"]);

const TYPE_ICONS: Record<string, any> = {
  folder: Folder, song: Music, album: Disc3, playlist: ListMusic,
  photo_album: Image, video: Video, link: Link2, text: FileText,
};
const TYPE_ICON_BG: Record<string, string> = {
  folder: "bg-amber-100 text-amber-600", album: "bg-purple-100 text-purple-600",
  playlist: "bg-blue-100 text-blue-600", photo_album: "bg-pink-100 text-pink-600",
};

type Step = "type" | "form" | "location";

export function AddNodeDialog({
  open,
  onOpenChange,
  parentId,
  allNodes,
  onNodeCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  allNodes: MenuNodeWithMetadata[];
  onNodeCreated: (id: string) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  // Location picker state
  const [browsingId, setBrowsingId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentId);

  const selectedConfig = NODE_TYPES.find((t) => t.type === selectedType);

  const resetForm = () => {
    setStep("type");
    setSelectedType(null);
    setTitle("");
    setArtistName("");
    setAlbumName("");
    setLinkUrl("");
    setBodyText("");
    setBrowsingId(null);
    setSelectedParentId(parentId);
  };

  const createMutation = useMutation({
    mutationFn: async (overrideParentId?: string | null) => {
      const effectiveParentId = overrideParentId !== undefined ? overrideParentId : selectedParentId;
      const siblings = allNodes.filter((n) => n.parentId === effectiveParentId);
      const body: any = {
        parentId: effectiveParentId,
        type: selectedType,
        title,
        sortOrder: siblings.length,
        status: "draft",
        metadata: {},
      };
      if (selectedType === "song") { body.metadata.artistName = artistName || null; body.metadata.albumName = albumName || null; }
      if (selectedType === "album") { body.metadata.artistName = artistName || null; }
      if (selectedType === "link") { body.metadata.linkUrl = linkUrl || null; }
      if (selectedType === "text") { body.metadata.bodyText = bodyText || null; }
      const res = await apiRequest("POST", "/api/nodes", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Created", description: `"${title}" is ready to edit.` });
      onNodeCreated(data.id);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Build breadcrumb path for the current browsing location
  const getBreadcrumb = (id: string | null): MenuNodeWithMetadata[] => {
    const path: MenuNodeWithMetadata[] = [];
    let current = id;
    while (current) {
      const node = allNodes.find((n) => n.id === current);
      if (!node) break;
      path.unshift(node);
      current = node.parentId;
    }
    return path;
  };

  // Children of current browsing folder (only folder-like types)
  const currentChildren = allNodes
    .filter((n) => n.parentId === browsingId && FOLDER_TYPES.has(n.type))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const breadcrumb = getBreadcrumb(browsingId);

  // Resolve display name for selectedParentId
  const getLocationLabel = (pid: string | null) => {
    if (pid === null) return "Top level";
    const n = allNodes.find((x) => x.id === pid);
    return n ? n.title : "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
        {step === "type" ? (
          <>
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-6 py-5">
              <DialogTitle className="text-white text-base font-bold">What are you creating?</DialogTitle>
              <p className="text-white/65 text-sm mt-0.5">Pick a content type</p>
            </div>

            {/* Type grid */}
            <div className="grid grid-cols-2 gap-2.5 p-5">
              {NODE_TYPES.map((t) => (
                <button
                  key={t.type}
                  className={cn(
                    "group flex items-center gap-3 p-3.5 rounded-xl border border-border/60 transition-all duration-150 text-left active:scale-[0.97]",
                    t.hoverBg
                  )}
                  onClick={() => { setSelectedType(t.type); setStep("form"); }}
                  data-testid={`button-type-${t.type}`}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", t.iconBg)}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{t.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : step === "form" ? (
          <>
            {/* Gradient header based on selected type */}
            {selectedConfig && (
              <div className={cn("bg-gradient-to-br px-6 py-5", selectedConfig.gradient, "from-opacity-80")}>
                <button
                  onClick={() => setStep("type")}
                  className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium mb-3 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0">
                    <selectedConfig.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-white text-base font-bold">New {selectedConfig.label}</DialogTitle>
                    <p className="text-white/65 text-xs mt-0.5">{selectedConfig.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Title</Label>
                <Input
                  data-testid="input-new-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${selectedConfig?.label} title…`}
                  className="bg-muted/30"
                  autoFocus
                />
              </div>

              {selectedType === "song" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Artist</Label>
                    <Input data-testid="input-new-artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" className="bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Album</Label>
                    <Input data-testid="input-new-album" value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Album name" className="bg-muted/30" />
                  </div>
                </div>
              )}

              {selectedType === "album" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Artist</Label>
                  <Input data-testid="input-new-artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" className="bg-muted/30" />
                </div>
              )}

              {selectedType === "link" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">URL</Label>
                  <Input data-testid="input-new-link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="bg-muted/30" />
                </div>
              )}

              {selectedType === "text" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Body Text</Label>
                  <Textarea data-testid="input-new-body-text" value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={4} placeholder="Write something…" className="bg-muted/30 resize-y" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="default" onClick={() => { onOpenChange(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  size="default"
                  onClick={() => {
                    if (parentId) {
                      // Opened from inside an editor — create as child immediately
                      createMutation.mutate(parentId);
                    } else {
                      // Opened from top-level — show location picker
                      setBrowsingId(null);
                      setSelectedParentId(parentId);
                      setStep("location");
                    }
                  }}
                  disabled={!title.trim() || createMutation.isPending}
                  data-testid="button-next-location"
                  className={cn("px-6 gap-2 bg-gradient-to-r border-0 shadow-sm", selectedConfig?.gradient)}
                >
                  {parentId
                    ? createMutation.isPending ? "Creating…" : "Create"
                    : <>Next <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Location picker header */}
            {selectedConfig && (
              <div className={cn("bg-gradient-to-br px-6 py-5", selectedConfig.gradient, "from-opacity-80")}>
                <button
                  onClick={() => setStep("form")}
                  className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium mb-3 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <DialogTitle className="text-white text-base font-bold">Where should it live?</DialogTitle>
                <p className="text-white/65 text-sm mt-0.5">
                  Choose a location for "{title}"
                </p>
              </div>
            )}

            <div className="flex flex-col max-h-[50vh]">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 px-5 pt-4 pb-2 text-xs text-muted-foreground flex-wrap">
                <button
                  onClick={() => setBrowsingId(null)}
                  className={cn(
                    "font-medium transition-colors",
                    browsingId === null ? "text-foreground" : "hover:text-foreground"
                  )}
                >
                  Root
                </button>
                {breadcrumb.map((node) => (
                  <span key={node.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 opacity-40" />
                    <button
                      onClick={() => setBrowsingId(node.id)}
                      className={cn(
                        "font-medium transition-colors",
                        browsingId === node.id ? "text-foreground" : "hover:text-foreground"
                      )}
                    >
                      {node.title}
                    </button>
                  </span>
                ))}
              </div>

              {/* Folder list */}
              <div className="overflow-y-auto flex-1 px-3 pb-2">
                {/* "Place here" button */}
                <button
                  onClick={() => setSelectedParentId(browsingId)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm rounded-xl transition-all flex items-center gap-3 mb-1",
                    selectedParentId === browsingId
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold"
                      : "hover:bg-muted border border-transparent text-muted-foreground"
                  )}
                >
                  <CornerDownRight className="h-4 w-4 flex-shrink-0" />
                  Place here{browsingId ? "" : " (top level)"}
                </button>

                {/* Drillable folders */}
                {currentChildren.map((node) => {
                  const Icon = TYPE_ICONS[node.type] || Folder;
                  const iconBg = TYPE_ICON_BG[node.type] || "bg-gray-100 text-gray-500";
                  const meta = node.metadata as any;
                  const coverUrl = meta?.coverImageUrl;

                  return (
                    <div
                      key={node.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group"
                    >
                      {/* Tap folder name to drill in */}
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => setBrowsingId(node.id)}
                      >
                        {coverUrl ? (
                          <img src={coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-border/50" />
                        ) : (
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{node.title}</span>
                      </button>
                      {/* Select as destination */}
                      <button
                        onClick={() => setSelectedParentId(node.id)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0",
                          selectedParentId === node.id
                            ? "bg-indigo-100 border-indigo-300 text-indigo-700 font-semibold"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {selectedParentId === node.id ? "Selected" : "Select"}
                      </button>
                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 cursor-pointer hover:text-muted-foreground"
                        onClick={() => setBrowsingId(node.id)}
                      />
                    </div>
                  );
                })}

                {currentChildren.length === 0 && browsingId !== null && (
                  <p className="text-xs text-muted-foreground text-center py-4">No sub-folders here</p>
                )}
              </div>

              {/* Create button */}
              <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground truncate">
                  Placing in: <span className="font-semibold text-foreground">{getLocationLabel(selectedParentId)}</span>
                </p>
                <Button
                  size="default"
                  onClick={() => createMutation.mutate()}
                  disabled={!title.trim() || createMutation.isPending}
                  data-testid="button-create-node"
                  className={cn("px-6 gap-2 bg-gradient-to-r border-0 shadow-sm flex-shrink-0", selectedConfig?.gradient)}
                >
                  {createMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
