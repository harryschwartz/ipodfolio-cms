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
  Disc3,
  ListMusic,
  Image,
  Video,
  Link2,
  FileText,
  Folder,
  Settings,
  Gamepad2,
  Layers,
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5 md:space-y-6 pb-24 md:pb-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={cn(
                  "text-xs",
                  TYPE_BADGE_COLORS[node.type] || "bg-muted"
                )}
              >
                {TYPE_LABELS[node.type] || node.type}
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="status-toggle" className="text-xs text-muted-foreground">
                  {node.status === "published" ? "Published" : "Draft"}
                </Label>
                <Switch
                  id="status-toggle"
                  data-testid="switch-status"
                  checked={node.status === "published"}
                  onCheckedChange={(checked) => publishMutation.mutate(checked)}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs text-muted-foreground">
              Title
            </Label>
            <Input
              id="title"
              data-testid="input-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isReadOnly}
              className="bg-card text-base md:text-sm h-11 md:h-9"
            />
          </div>

          {isReadOnly && (
            <p className="text-xs text-muted-foreground italic">
              This is a system node with read-only properties.
            </p>
          )}

          {/* Type-specific fields */}
          {!isReadOnly && (
            <>
              <Separator />

              {/* Song fields */}
              {node.type === "song" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Artist</Label>
                      <Input
                        data-testid="input-artist"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        className="bg-card text-base md:text-sm h-11 md:h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Album</Label>
                      <Input
                        data-testid="input-album"
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        className="bg-card text-base md:text-sm h-11 md:h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Duration (seconds)</Label>
                    <Input
                      data-testid="input-duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                      className="bg-card w-32 text-base md:text-sm h-11 md:h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cover Image</Label>
                    <ImageUploader
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Audio</Label>
                    {audioUrl ? (
                      <div className="space-y-2">
                        <audio controls src={audioUrl} className="w-full h-10" />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAudioUrl("")}
                          data-testid="button-remove-audio"
                          className="h-9"
                        >
                          Remove Audio
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAudioUpload(file);
                              }}
                            />
                            <Button variant="secondary" size="sm" asChild>
                              <span data-testid="button-upload-audio" className="h-9 px-4">
                                <Upload className="h-4 w-4 mr-1.5" />
                                Upload File
                              </span>
                            </Button>
                          </label>
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
                  </div>
                </div>
              )}

              {/* Album fields */}
              {node.type === "album" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Artist</Label>
                    <Input
                      data-testid="input-artist"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="bg-card text-base md:text-sm h-11 md:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cover Image</Label>
                    <ImageUploader
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Children</Label>
                    <div className="space-y-1 rounded-md border border-border bg-card p-2">
                      {allNodes
                        .filter((n) => n.parentId === node.id)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2 text-sm md:text-xs p-2 md:p-1 hover:bg-muted/50 active:bg-muted/70 rounded cursor-pointer"
                            onClick={() => onSelectNode(child.id)}
                          >
                            <span className="text-muted-foreground">{child.sortOrder + 1}.</span>
                            <span>{child.title}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                              {child.type}
                            </Badge>
                          </div>
                        ))}
                      {allNodes.filter((n) => n.parentId === node.id).length === 0 && (
                        <p className="text-xs text-muted-foreground italic p-1">No children</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Playlist fields */}
              {node.type === "playlist" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cover Image</Label>
                    <ImageUploader
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      onUpload={(file) => handleImageUpload(file, setCoverImageUrl)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Songs</Label>
                    <div className="space-y-1 rounded-md border border-border bg-card p-2">
                      {allNodes
                        .filter((n) => n.type === "song")
                        .map((song) => (
                          <div key={song.id} className="flex items-center gap-2 text-sm md:text-xs p-2 md:p-1">
                            <Music className="h-4 w-4 md:h-3 md:w-3 text-green-400" />
                            <span>{song.title}</span>
                            <span className="text-muted-foreground">
                              — {song.metadata?.artistName}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Folder fields */}
              {node.type === "folder" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Preview Image</Label>
                    <ImageUploader
                      value={previewImage}
                      onChange={setPreviewImage}
                      onUpload={(file) => handleImageUpload(file, setPreviewImage)}
                    />
                  </div>
                </div>
              )}

              {/* Photo Album fields */}
              {node.type === "photo_album" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Photos</Label>
                    <div className="space-y-2">
                      {photos.map((photo, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-md border border-border bg-card"
                        >
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {photo.url ? (
                              <img
                                src={photo.url}
                                alt={photo.caption || ""}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <Input
                              placeholder="Caption"
                              value={photo.caption || ""}
                              onChange={(e) => {
                                const updated = [...photos];
                                updated[i] = { ...updated[i], caption: e.target.value };
                                setPhotos(updated);
                              }}
                              className="bg-background text-sm md:text-xs h-9 md:h-7"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 md:h-7 md:w-7 p-0"
                            onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4 md:h-3 md:w-3" />
                          </Button>
                        </div>
                      ))}
                      <label className="cursor-pointer">
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
                        <Button variant="secondary" size="sm" asChild>
                          <span data-testid="button-add-photos" className="h-9 px-4">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Photos
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Video fields */}
              {node.type === "video" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Video URL or Upload</Label>
                    <Input
                      data-testid="input-video-url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-card text-base md:text-sm h-11 md:h-9"
                    />
                    <label className="cursor-pointer inline-block">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                        }}
                      />
                      <Button variant="secondary" size="sm" asChild>
                        <span data-testid="button-upload-video" className="h-9 px-4">
                          <Upload className="h-4 w-4 mr-1.5" />
                          Upload Video
                        </span>
                      </Button>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Thumbnail</Label>
                    <ImageUploader
                      value={videoThumbnailUrl}
                      onChange={setVideoThumbnailUrl}
                      onUpload={(file) => handleImageUpload(file, setVideoThumbnailUrl)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                      className="bg-card w-32 text-base md:text-sm h-11 md:h-9"
                    />
                  </div>
                </div>
              )}

              {/* Link fields */}
              {node.type === "link" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">URL</Label>
                    <Input
                      data-testid="input-link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-card text-base md:text-sm h-11 md:h-9"
                    />
                  </div>
                </div>
              )}

              {/* Text fields */}
              {node.type === "text" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Body Text</Label>
                    <Textarea
                      data-testid="input-body-text"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={6}
                      className="bg-card resize-y text-base md:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Links</Label>
                    <div className="space-y-2">
                      {links.map((link, i) => (
                        <div key={i} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[i] = { ...updated[i], label: e.target.value };
                              setLinks(updated);
                            }}
                            placeholder="Label"
                            className="bg-card text-sm flex-1 h-10 md:h-8"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => {
                              const updated = [...links];
                              updated[i] = { ...updated[i], url: e.target.value };
                              setLinks(updated);
                            }}
                            placeholder="URL"
                            className="bg-card text-sm flex-1 h-10 md:h-8"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 md:h-7 md:w-7 p-0 self-end md:self-auto"
                            onClick={() => setLinks(links.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4 md:h-3 md:w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setLinks([...links, { label: "", url: "" }])}
                        data-testid="button-add-link"
                        className="h-9"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Sticky bottom action bar */}
      <div className="shrink-0 border-t border-border bg-sidebar/95 backdrop-blur-sm px-4 py-3 md:py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="default"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            data-testid="button-save"
            className="h-10 md:h-8 px-5 md:px-3 text-sm md:text-xs"
          >
            <Save className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="default"
              variant="destructive"
              data-testid="button-delete"
              className="h-10 md:h-8 w-10 md:w-8 p-0"
            >
              <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{node.title}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this node and all its children.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    <div className="space-y-2">
      {value && (
        <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border bg-muted">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-7 w-7 md:h-5 md:w-5 p-0"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4 md:h-3 md:w-3" />
          </Button>
        </div>
      )}
      {!value && (
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <div className="w-32 h-32 rounded-md border border-dashed border-border bg-card flex flex-col items-center justify-center gap-1 hover:bg-muted/50 active:bg-muted/70 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload</span>
          </div>
        </label>
      )}
    </div>
  );
}
