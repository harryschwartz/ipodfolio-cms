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
  { type: "folder", label: "Folder", icon: Folder, emoji: "📁", color: "text-amber-400 bg-amber-400/10" },
  { type: "song", label: "Song", icon: Music, emoji: "🎵", color: "text-green-400 bg-green-400/10" },
  { type: "album", label: "Album", icon: Disc3, emoji: "💿", color: "text-purple-400 bg-purple-400/10" },
  { type: "playlist", label: "Playlist", icon: ListMusic, emoji: "📋", color: "text-blue-400 bg-blue-400/10" },
  { type: "photo_album", label: "Photo Album", icon: Image, emoji: "📷", color: "text-pink-400 bg-pink-400/10" },
  { type: "video", label: "Video", icon: Video, emoji: "🎬", color: "text-red-400 bg-red-400/10" },
  { type: "link", label: "Link", icon: Link2, emoji: "🔗", color: "text-cyan-400 bg-cyan-400/10" },
  { type: "text", label: "Text", icon: FileText, emoji: "📝", color: "text-slate-400 bg-slate-400/10" },
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
          <DialogTitle className="text-base">
            {step === "type" ? "Add New Node" : `New ${NODE_TYPES.find((t) => t.type === selectedType)?.label}`}
          </DialogTitle>
          {parentNode && (
            <p className="text-xs text-muted-foreground">
              Adding to: {parentNode.title}
            </p>
          )}
          {!parentNode && parentId === null && (
            <p className="text-xs text-muted-foreground">Adding to root level</p>
          )}
        </DialogHeader>

        {step === "type" && (
          <div className="grid grid-cols-4 gap-2 py-2">
            {NODE_TYPES.map((t) => (
              <button
                key={t.type}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border transition-colors",
                  "hover:bg-muted/50 hover:border-primary/30",
                  "focus:outline-none focus:ring-2 focus:ring-primary"
                )}
                onClick={() => {
                  setSelectedType(t.type);
                  setStep("form");
                }}
                data-testid={`button-type-${t.type}`}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", t.color)}>
                  <t.icon className="h-5 w-5" />
                </div>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === "form" && selectedType && (
          <div className="space-y-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("type")}
              className="text-xs -ml-2 text-muted-foreground"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back to type selection
            </Button>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                data-testid="input-new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="bg-card"
                autoFocus
              />
            </div>

            {selectedType === "song" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Artist</Label>
                  <Input
                    data-testid="input-new-artist"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Album</Label>
                  <Input
                    data-testid="input-new-album"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    className="bg-card"
                  />
                </div>
              </div>
            )}

            {selectedType === "album" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Artist</Label>
                <Input
                  data-testid="input-new-artist"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="bg-card"
                />
              </div>
            )}

            {selectedType === "link" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input
                  data-testid="input-new-link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-card"
                />
              </div>
            )}

            {selectedType === "text" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Body Text</Label>
                <Textarea
                  data-testid="input-new-body-text"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={4}
                  className="bg-card resize-y"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                data-testid="button-create-node"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
