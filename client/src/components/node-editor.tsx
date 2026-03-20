import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Save,
  Upload,
  Plus,
  X,
  Music,
  ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/audio-recorder";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";

const TYPE_LABELS: Record<string, string> = {
  folder: "Folder",
  song: "Song",
  album: "Album",
  playlist: "Playlist",
  photo_album: "Photo Album",
  video: "Video",
  link: "Link",
  text: "Text",
  settings: "Settings",
  game: "Game",
  cover_flow_home: "Cover Flow (Home)",
  cover_flow_music: "Cover Flow (Music)",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  folder: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  song: "bg-green-500/15 text-green-400 border-green-500/20",
  album: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  playlist: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  photo_album: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  video: "bg-red-500/15 text-red-400 border-red-500/20",
  link: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  text: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  settings: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  game: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  cover_flow_home: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  cover_flow_music: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 space-y-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NodeEditor({
  node,
  allNodes,
  onSelectNode,
}: {
  node: MenuNodeWithMetadata;
  allNodes: MenuNodeWithMetadata[];
  onSelectNode: (id: string) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(node.title);
  const [artistName, setArtistName] = useState(node.metadata?.artistName || "");
  const [albumName, setAlbumName] = useState(node.metadata?.albumName || "");
  const [audioUrl, setAudioUrl] = useState(node.metadata?.audioUrl || "");
  const [videoUrl, setVideoUrl] = useState(node.metadata?.videoUrl || "");
  const [linkUrl, setLinkUrl] = useState(node.metadata?.linkUrl || "");
  const [bodyText, setBodyText] = useState(node.metadata?.bodyText || "");
  const [coverImageUrl, setCoverImageUrl] = useState(node.metadata?.coverImageUrl || "");
  const [previewImage, setPreviewImage] = useState(node.metadata?.previewImage || "");
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState(node.metadata?.videoThumbnailUrl || "");
  const [duration, setDuration] = useState(node.metadata?.duration || 0);
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(
    (node.metadata?.links as any) || []
  );
  const [photos, setPhotos] = useState<Array<{ url: string; caption?: string; sortOrder: number }>>(
    (node.metadata?.photos as any) || []
  );

  // Reset state when node changes
  const [prevNodeId, setPrevNodeId] = useState(node.id);
  if (node.id !== prevNodeId) {
    setPrevNodeId(node.id);
    setTitle(node.title);
    setArtistName(node.metadata?.artistName || "");
    setAlbumName(node.metadata?.albumName || "");
    setAudioUrl(node.metadata?.audioUrl || "");
    setVideoUrl(node.metadata?.videoUrl || "");
    setLinkUrl(node.metadata?.linkUrl || "");
    setBodyText(node.metadata?.bodyText || "");
    setCoverImageUrl(node.metadata?.coverImageUrl || "");
    setPreviewImage(node.metadata?.previewImage || "");
    setVideoThumbnailUrl(node.metadata?.videoThumbnailUrl || "");
    setDuration(node.metadata?.duration || 0);
    setLinks((node.metadata?.links as any) || []);
    setPhotos((node.metadata?.photos as any) || []);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        title,
        metadata: {
          artistName: artistName || null,
          albumName: albumName || null,
          audioUrl: audioUrl || null,
          videoUrl: videoUrl || null,
          linkUrl: linkUrl || null,
          bodyText: bodyText || null,
          coverImageUrl: coverImageUrl || null,
          previewImage: previewImage || null,
          videoThumbnailUrl: videoThumbnailUrl || null,
          duration: duration || null,
          links: links.length > 0 ? links : null,
          photos: photos.length > 0 ? photos : null,
        },
      };
      await apiRequest("PATCH", `/api/nodes/${node.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Saved", description: "Changes saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/nodes/${node.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      onSelectNode("");
      toast({ title: "Deleted", description: "Node deleted." });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      await apiRequest("POST", `/api/nodes/${node.id}/${publish ? "publish" : "unpublish"}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    },
  });

  const handleImageUpload = async (
    file: File,
    setter: (url: string) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/upload/image`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    setter(data.url);
  };

  const handleAudioUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/upload/audio`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    setAudioUrl(data.url);
  };

  const handleVideoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/upload/video`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    setVideoUrl(data.url);
  };

  const isReadOnly = ["settings", "game", "cover_flow_home", "cover_flow_music"].includes(
    node.type
  );

  // Breadcrumb: find parent chain
  const parentNode = node.parentId ? allNodes.find((n) => n.id === node.parentId) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Node header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border bg-background">
        {/* Breadcrumb */}
        {parentNode && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <button
              onClick={() => onSelectNode(parentNode.id)}
              className="hover:text-foreground transition-colors"
            >
              {parentNode.title}
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/70">{node.title}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge
              className={cn(
                "text-xs font-medium px-2.5 py-0.5",
                TYPE_BADGE_COLORS[node.type] || "bg-muted"
              )}
            >
              {TYPE_LABELS[node.type] || node.type}
            </Badge>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              node.status === "published" ? "bg-green-400" : "bg-muted-foreground/40"
            )} />
            <span className="text-sm text-muted-foreground">
              {node.status === "published" ? "Published" : "Draft"}
            </span>
            <Switch
              id="status-toggle"
              data-testid="switch-status"
              checked={node.status === "published"}
              onCheckedChange={(checked) => publishMutation.mutate(checked)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Title — inline large text field */}
        <div className="mt-3">
          <Input
            id="title"
            data-testid="input-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadOnly}
            placeholder="Untitled"
            className="text-xl font-semibold bg-transparent border-0 px-0 h-auto py-1 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-6 pb-24 space-y-6">

          {isReadOnly && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                This is a system node — its properties are managed automatically.
              </p>
            </div>
          )}

          {/* Type-specific fields */}
          {!isReadOnly && (
            <>
              {/* Song fields */}
              {node.type === "song" && (
                <>
                  <div>
                    <SectionHeader>Track Details</SectionHeader>
                    <FieldGroup>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Artist">
                          <Input
                            data-testid="input-artist"
                            value={artistName}
                            onChange={(e) => setArtistName(e.target.value)}
                            placeholder="Artist name"
                            className="bg-background"
                          />
                        </Field>
                        <Field label="Album">
                          <Input
                            data-testid="input-album"
                            value={albumName}
                            onChange={(e) => setAlbumName(e.target.value)}
                            placeholder="Album name"
                            className="bg-background"
                          />
                        </Field>
                      </div>
                      <Field label="Duration" hint="Duration in seconds">
                        <Input
                          data-testid="input-duration"
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                          className="bg-background w-32"
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader
                        value={coverImageUrl}
                        onChange={setCoverImageUrl}
                        onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                      />
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Audio File</SectionHeader>
                    <FieldGroup>
                      {audioUrl ? (
                        <div className="space-y-3">
                          <audio controls src={audioUrl} className="w-full" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAudioUrl("")}
                            data-testid="button-remove-audio"
                            className="gap-2"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove Audio
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAudioUpload(file);
                              }}
                            />
                            <div className="w-full rounded-lg border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 py-6 hover:bg-muted/40 transition-colors">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Click to upload audio file</span>
                              <span className="text-xs text-muted-foreground/60">MP3, AAC, WAV, FLAC</span>
                            </div>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs text-muted-foreground">
                              <span className="px-2 bg-card">or record in browser</span>
                            </div>
                          </div>
                          <AudioRecorder
                            onRecordingComplete={(blob) => {
                              const file = new File([blob], "recording.webm", {
                                type: blob.type,
                              });
                              handleAudioUpload(file);
                            }}
                          />
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* Album fields */}
              {node.type === "album" && (
                <>
                  <div>
                    <SectionHeader>Album Details</SectionHeader>
                    <FieldGroup>
                      <Field label="Artist">
                        <Input
                          data-testid="input-artist"
                          value={artistName}
                          onChange={(e) => setArtistName(e.target.value)}
                          placeholder="Artist name"
                          className="bg-background"
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader
                        value={coverImageUrl}
                        onChange={setCoverImageUrl}
                        onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                      />
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Tracks</SectionHeader>
                    <FieldGroup className="p-0 overflow-hidden">
                      {allNodes
                        .filter((n) => n.parentId === node.id)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((child, idx) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0"
                            onClick={() => onSelectNode(child.id)}
                          >
                            <span className="text-sm text-muted-foreground w-5 text-right">{idx + 1}</span>
                            <span className="text-sm flex-1">{child.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {child.type}
                            </Badge>
                          </div>
                        ))}
                      {allNodes.filter((n) => n.parentId === node.id).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No tracks yet
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* Playlist fields */}
              {node.type === "playlist" && (
                <>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader
                        value={coverImageUrl}
                        onChange={setCoverImageUrl}
                        onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                      />
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Songs</SectionHeader>
                    <FieldGroup className="p-0 overflow-hidden">
                      {allNodes
                        .filter((n) => n.type === "song")
                        .map((song) => (
                          <div key={song.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                            <Music className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{song.title}</p>
                              {song.metadata?.artistName && (
                                <p className="text-xs text-muted-foreground truncate">{song.metadata.artistName}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      {allNodes.filter((n) => n.type === "song").length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No songs yet
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* Folder fields */}
              {node.type === "folder" && (
                <div>
                  <SectionHeader>Preview Image</SectionHeader>
                  <FieldGroup>
                    <ImageUploader
                      value={previewImage}
                      onChange={setPreviewImage}
                      onUpload={(file) => handleImageUpload(file, setPreviewImage)}
                    />
                  </FieldGroup>
                </div>
              )}

              {/* Photo Album fields */}
              {node.type === "photo_album" && (
                <div>
                  <SectionHeader>Photos</SectionHeader>
                  <FieldGroup className="space-y-3">
                    {photos.map((photo, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background"
                      >
                        <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt={photo.caption || ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Caption (optional)"
                            value={photo.caption || ""}
                            onChange={(e) => {
                              const updated = [...photos];
                              updated[i] = { ...updated[i], caption: e.target.value };
                              setPhotos(updated);
                            }}
                            className="bg-background text-sm h-8"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          for (const file of Array.from(files)) {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch(
                              `${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/upload/image`,
                              { method: "POST", body: formData }
                            );
                            const data = await res.json();
                            setPhotos((prev) => [
                              ...prev,
                              { url: data.url, caption: "", sortOrder: prev.length },
                            ]);
                          }
                        }}
                      />
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <span data-testid="button-add-photos">
                          <Plus className="h-4 w-4" />
                          Add Photos
                        </span>
                      </Button>
                    </label>
                  </FieldGroup>
                </div>
              )}

              {/* Video fields */}
              {node.type === "video" && (
                <>
                  <div>
                    <SectionHeader>Video</SectionHeader>
                    <FieldGroup>
                      <Field label="Video URL">
                        <Input
                          data-testid="input-video-url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-background"
                        />
                      </Field>
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(file);
                          }}
                        />
                        <Button variant="outline" size="sm" asChild className="gap-2">
                          <span data-testid="button-upload-video">
                            <Upload className="h-3.5 w-3.5" />
                            Upload Video File
                          </span>
                        </Button>
                      </label>
                      <Field label="Duration" hint="Duration in seconds">
                        <Input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                          className="bg-background w-32"
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Thumbnail</SectionHeader>
                    <FieldGroup>
                      <ImageUploader
                        value={videoThumbnailUrl}
                        onChange={setVideoThumbnailUrl}
                        onUpload={(file) => handleImageUpload(file, setVideoThumbnailUrl)}
                      />
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* Link fields */}
              {node.type === "link" && (
                <div>
                  <SectionHeader>Link Details</SectionHeader>
                  <FieldGroup>
                    <Field label="URL">
                      <Input
                        data-testid="input-link-url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-background"
                      />
                    </Field>
                  </FieldGroup>
                </div>
              )}

              {/* Text fields */}
              {node.type === "text" && (
                <>
                  <div>
                    <SectionHeader>Content</SectionHeader>
                    <FieldGroup>
                      <Field label="Body Text">
                        <Textarea
                          data-testid="input-body-text"
                          value={bodyText}
                          onChange={(e) => setBodyText(e.target.value)}
                          rows={8}
                          placeholder="Write your content here..."
                          className="bg-background resize-y text-sm leading-relaxed"
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div>
                    <SectionHeader>Links</SectionHeader>
                    <FieldGroup>
                      <div className="space-y-3">
                        {links.map((link, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={link.label}
                              onChange={(e) => {
                                const updated = [...links];
                                updated[i] = { ...updated[i], label: e.target.value };
                                setLinks(updated);
                              }}
                              placeholder="Label"
                              className="bg-background flex-1"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) => {
                                const updated = [...links];
                                updated[i] = { ...updated[i], url: e.target.value };
                                setLinks(updated);
                              }}
                              placeholder="https://..."
                              className="bg-background flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 flex-shrink-0"
                              onClick={() => setLinks(links.filter((_, j) => j !== i))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLinks([...links, { label: "", url: "" }])}
                          data-testid="button-add-link"
                          className="gap-2"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Link
                        </Button>
                      </div>
                    </FieldGroup>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Sticky bottom action bar */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-3">
        <Button
          size="default"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || isReadOnly}
          data-testid="button-save"
          className="gap-2 px-6"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>

        {!isReadOnly && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="default"
                variant="ghost"
                data-testid="button-delete"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{node.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this node and all its children. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  data-testid="button-confirm-delete"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

function ImageUploader({
  value,
  onChange,
  onUpload,
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted group w-full max-w-xs">
          <img src={value} alt="" className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onChange("")}
              className="gap-2 shadow-lg"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <div className="w-full rounded-lg border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-2.5 py-10 hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Click to upload image</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG, GIF, WebP</p>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
