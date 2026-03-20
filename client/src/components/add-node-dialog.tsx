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
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";

const NODE_TYPES = [
  {
    type: "folder",
    label: "Folder",
    description: "Group related items",
    icon: Folder,
    color: "text-amber-400",
    bg: "bg-amber-400/10 group-hover:bg-amber-400/20",
    border: "group-hover:border-amber-400/30",
  },
  {
    type: "song",
    label: "Song",
    description: "Audio track with metadata",
    icon: Music,
    color: "text-green-400",
    bg: "bg-green-400/10 group-hover:bg-green-400/20",
    border: "group-hover:border-green-400/30",
  },
  {
    type: "album",
    label: "Album",
    description: "Music album with cover",
    icon: Disc3,
    color: "text-purple-400",
    bg: "bg-purple-400/10 group-hover:bg-purple-400/20",
    border: "group-hover:border-purple-400/30",
  },
  {
    type: "playlist",
    label: "Playlist",
    description: "Curated song collection",
    icon: ListMusic,
    color: "text-blue-400",
    bg: "bg-blue-400/10 group-hover:bg-blue-400/20",
    border: "group-hover:border-blue-400/30",
  },
  {
    type: "photo_album",
    label: "Photos",
    description: "Photo gallery",
    icon: Image,
    color: "text-pink-400",
    bg: "bg-pink-400/10 group-hover:bg-pink-400/20",
    border: "group-hover:border-pink-400/30",
  },
  {
    type: "video",
    label: "Video",
    description: "Video with thumbnail",
    icon: Video,
    color: "text-red-400",
    bg: "bg-red-400/10 group-hover:bg-red-400/20",
    border: "group-hover:border-red-400/30",
  },
  {
    type: "link",
    label: "Link",
    description: "External URL",
    icon: Link2,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 group-hover:bg-cyan-400/20",
    border: "group-hover:border-cyan-400/30",
  },
  {
    type: "text",
    label: "Text",
    description: "Rich text content",
    icon: FileText,
    color: "text-slate-400",
    bg: "bg-slate-400/10 group-hover:bg-slate-400/20",
    border: "group-hover:border-slate-400/30",
  },
];

type Step = "type" | "form";

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

  const parentNode = parentId ? allNodes.find((n) => n.id === parentId) : null;
  const selectedTypeConfig = NODE_TYPES.find((t) => t.type === selectedType);

  const resetForm = () => {
    setStep("type");
    setSelectedType(null);
    setTitle("");
    setArtistName("");
    setAlbumName("");
    setLinkUrl("");
    setBodyText("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const siblings = allNodes.filter((n) => n.parentId === parentId);
      const body: any = {
        parentId,
        type: selectedType,
        title,
        sortOrder: siblings.length,
        status: "draft",
        metadata: {},
      };

      if (selectedType === "song") {
        body.metadata.artistName = artistName || null;
        body.metadata.albumName = albumName || null;
      }
      if (selectedType === "album") {
        body.metadata.artistName = artistName || null;
      }
      if (selectedType === "link") {
        body.metadata.linkUrl = linkUrl || null;
      }
      if (selectedType === "text") {
        body.metadata.bodyText = bodyText || null;
      }

      const res = await apiRequest("POST", "/api/nodes", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Created", description: `"${title}" has been created.` });
      onNodeCreated(data.id);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {step === "type" ? "Add New Item" : `New ${selectedTypeConfig?.label}`}
          </DialogTitle>
          {step === "type" && (
            <p className="text-sm text-muted-foreground">
              {parentNode
                ? `Adding inside "${parentNode.title}"`
                : "Adding at root level"}
            </p>
          )}
        </DialogHeader>

        {step === "type" && (
          <div className="grid grid-cols-2 gap-2 py-1">
            {NODE_TYPES.map((t) => (
              <button
                key={t.type}
                className={cn(
                  "group flex items-center gap-3 p-3.5 rounded-xl border border-border/60 transition-all duration-150 text-left",
                  "hover:shadow-sm active:scale-[0.98]",
                  t.border
                )}
                onClick={() => {
                  setSelectedType(t.type);
                  setStep("form");
                }}
                data-testid={`button-type-${t.type}`}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", t.bg)}>
                  <t.icon className={cn("h-4.5 w-4.5", t.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{t.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "form" && selectedType && (
          <div className="space-y-4 py-1">
            <button
              onClick={() => setStep("type")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>

            {/* Type preview */}
            {selectedTypeConfig && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", selectedTypeConfig.bg.split(" ")[0])}>
                  <selectedTypeConfig.icon className={cn("h-4 w-4", selectedTypeConfig.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedTypeConfig.label}</p>
                  <p className="text-xs text-muted-foreground">{selectedTypeConfig.description}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                data-testid="input-new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${selectedTypeConfig?.label} title…`}
                className="bg-muted/30"
                autoFocus
              />
            </div>

            {selectedType === "song" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Artist</Label>
                  <Input
                    data-testid="input-new-artist"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Artist name"
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Album</Label>
                  <Input
                    data-testid="input-new-album"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="Album name"
                    className="bg-muted/30"
                  />
                </div>
              </div>
            )}

            {selectedType === "album" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Artist</Label>
                <Input
                  data-testid="input-new-artist"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist name"
                  className="bg-muted/30"
                />
              </div>
            )}

            {selectedType === "link" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  data-testid="input-new-link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-muted/30"
                />
              </div>
            )}

            {selectedType === "text" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Body Text</Label>
                <Textarea
                  data-testid="input-new-body-text"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={4}
                  placeholder="Write something…"
                  className="bg-muted/30 resize-y"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="default"
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                data-testid="button-create-node"
                className="px-6"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
