import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Globe,
  EyeOff,
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

// Gradient header per type — makes every content type feel distinct and alive
const TYPE_GRADIENT: Record<string, string> = {
  folder:          "from-amber-400  to-orange-400",
  song:            "from-emerald-400 to-green-500",
  album:           "from-purple-500  to-violet-500",
  playlist:        "from-blue-400    to-cyan-500",
  photo_album:     "from-pink-400    to-rose-500",
  video:           "from-red-400     to-orange-500",
  link:            "from-cyan-400    to-blue-500",
  text:            "from-slate-400   to-gray-500",
  settings:        "from-gray-400    to-zinc-500",
  game:            "from-orange-400  to-amber-500",
  cover_flow_home: "from-indigo-500  to-purple-500",
  cover_flow_music:"from-violet-500  to-indigo-500",
};

// Header tinted bg per type
const TYPE_HEADER_BG: Record<string, string> = {
  folder:          "bg-gradient-to-r from-amber-50  to-orange-50",
  song:            "bg-gradient-to-r from-emerald-50 to-green-50",
  album:           "bg-gradient-to-r from-purple-50  to-violet-50",
  playlist:        "bg-gradient-to-r from-blue-50    to-cyan-50",
  photo_album:     "bg-gradient-to-r from-pink-50    to-rose-50",
  video:           "bg-gradient-to-r from-red-50     to-orange-50",
  link:            "bg-gradient-to-r from-cyan-50    to-blue-50",
  text:            "bg-gradient-to-r from-slate-50   to-gray-50",
  settings:        "bg-gradient-to-r from-gray-50    to-zinc-50",
  game:            "bg-gradient-to-r from-orange-50  to-amber-50",
  cover_flow_home: "bg-gradient-to-r from-indigo-50  to-purple-50",
  cover_flow_music:"bg-gradient-to-r from-violet-50  to-indigo-50",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  folder:          "bg-amber-100  text-amber-700  border-amber-200",
  song:            "bg-emerald-100 text-emerald-700 border-emerald-200",
  album:           "bg-purple-100  text-purple-700  border-purple-200",
  playlist:        "bg-blue-100    text-blue-700    border-blue-200",
  photo_album:     "bg-pink-100    text-pink-700    border-pink-200",
  video:           "bg-red-100     text-red-700     border-red-200",
  link:            "bg-cyan-100    text-cyan-700    border-cyan-200",
  text:            "bg-slate-100   text-slate-700   border-slate-200",
  settings:        "bg-gray-100    text-gray-600    border-gray-200",
  game:            "bg-orange-100  text-orange-700  border-orange-200",
  cover_flow_home: "bg-indigo-100  text-indigo-700  border-indigo-200",
  cover_flow_music:"bg-violet-100  text-violet-700  border-violet-200",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
      {children}
    </p>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-4 space-y-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-foreground/75">{label}</Label>
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
  const [splitScreen, setSplitScreen] = useState(node.metadata?.splitScreen ?? false);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState(node.metadata?.videoThumbnailUrl || "");
  const [duration, setDuration] = useState(node.metadata?.duration || 0);
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(
    (node.metadata?.links as any) || []
  );
  const [photos, setPhotos] = useState<Array<{ url: string; caption?: string; sortOrder: number }>>(
    (node.metadata?.photos as any) || []
  );

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
    setSplitScreen(node.metadata?.splitScreen ?? false);
    setVideoThumbnailUrl(node.metadata?.videoThumbnailUrl || "");
    setDuration(node.metadata?.duration || 0);
    setLinks((node.metadata?.links as any) || []);
    setPhotos((node.metadata?.photos as any) || []);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/nodes/${node.id}`, {
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
          splitScreen: splitScreen ?? null,
          videoThumbnailUrl: videoThumbnailUrl || null,
          duration: duration || null,
          links: links.length > 0 ? links : null,
          photos: photos.length > 0 ? photos : null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Saved ✓", description: "Your changes are live." });
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
      toast({ title: "Deleted", description: "Node removed." });
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

  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
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

  const isReadOnly = ["settings", "game", "cover_flow_home", "cover_flow_music"].includes(node.type);
  const parentNode = node.parentId ? allNodes.find((n) => n.id === node.parentId) : null;
  const gradient = TYPE_GRADIENT[node.type] || "from-indigo-500 to-violet-500";
  const headerBg = TYPE_HEADER_BG[node.type] || "bg-gradient-to-r from-indigo-50 to-violet-50";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Colored gradient accent stripe */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r flex-shrink-0", gradient)} />

      {/* Header */}
      <div className={cn("shrink-0 px-6 pt-4 pb-5 border-b border-border", headerBg)}>
        {/* Breadcrumb */}
        {parentNode && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <button
              onClick={() => onSelectNode(parentNode.id)}
              className="hover:text-foreground transition-colors font-medium"
            >
              {parentNode.title}
            </button>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="text-foreground/60">{node.title}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 border", TYPE_BADGE_COLORS[node.type] || "bg-muted")}>
            {TYPE_LABELS[node.type] || node.type}
          </Badge>

          {/* Publish toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {node.status === "published" ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Globe className="h-3.5 w-3.5" />
                Published
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" />
                Draft
              </div>
            )}
            <Switch
              id="status-toggle"
              data-testid="switch-status"
              checked={node.status === "published"}
              onCheckedChange={(checked) => publishMutation.mutate(checked)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Inline title */}
        <div className="mt-3">
          <Input
            id="title"
            data-testid="input-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadOnly}
            placeholder="Untitled"
            className="text-2xl font-bold bg-transparent border-0 px-0 h-auto py-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/25 tracking-tight"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-background">
        <div className="max-w-2xl mx-auto px-6 py-6 pb-24 space-y-6">

          {isReadOnly && (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                This is a system node — its properties are managed automatically.
              </p>
            </div>
          )}

          {!isReadOnly && (
            <>
              {/* ── SONG ── */}
              {node.type === "song" && (
                <>
                  <div>
                    <SectionHeader>Track Details</SectionHeader>
                    <FieldGroup>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Artist">
                          <Input data-testid="input-artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" />
                        </Field>
                        <Field label="Album">
                          <Input data-testid="input-album" value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Album name" />
                        </Field>
                      </div>
                      <Field label="Duration" hint="In seconds">
                        <Input data-testid="input-duration" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="w-32" />
                      </Field>
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader value={coverImageUrl} onChange={setCoverImageUrl} onUpload={(f) => handleImageUpload(f, setCoverImageUrl)} />
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Audio</SectionHeader>
                    <FieldGroup>
                      {audioUrl ? (
                        <div className="space-y-3">
                          <audio controls src={audioUrl} className="w-full" />
                          <Button variant="outline" size="sm" onClick={() => setAudioUrl("")} data-testid="button-remove-audio" className="gap-2">
                            <X className="h-3.5 w-3.5" />Remove Audio
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="cursor-pointer block">
                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioUpload(f); }} />
                            <div className="w-full rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 flex flex-col items-center gap-2 py-8 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition-colors flex items-center justify-center">
                                <Upload className="h-5 w-5 text-emerald-600" />
                              </div>
                              <p className="text-sm font-medium text-emerald-700">Upload audio file</p>
                              <p className="text-xs text-emerald-500">MP3, AAC, WAV, FLAC</p>
                            </div>
                          </label>
                          <div className="relative flex items-center gap-3">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-xs text-muted-foreground font-medium">or record in browser</span>
                            <div className="flex-1 border-t border-border" />
                          </div>
                          <AudioRecorder onRecordingComplete={(blob) => handleAudioUpload(new File([blob], "recording.webm", { type: blob.type }))} />
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* ── ALBUM ── */}
              {node.type === "album" && (
                <>
                  <div>
                    <SectionHeader>Details</SectionHeader>
                    <FieldGroup>
                      <Field label="Artist">
                        <Input data-testid="input-artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" />
                      </Field>
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader value={coverImageUrl} onChange={setCoverImageUrl} onUpload={(f) => handleImageUpload(f, setCoverImageUrl)} />
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Tracks</SectionHeader>
                    <FieldGroup className="p-0 overflow-hidden space-y-0">
                      {allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder).map((child, idx) => (
                        <div key={child.id} className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors cursor-pointer border-b border-border last:border-0" onClick={() => onSelectNode(child.id)}>
                          <span className="text-sm text-muted-foreground w-5 text-right tabular-nums">{idx + 1}</span>
                          <span className="text-sm flex-1 font-medium">{child.title}</span>
                          <Badge variant="secondary" className="text-xs">{child.type}</Badge>
                        </div>
                      ))}
                      {allNodes.filter((n) => n.parentId === node.id).length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tracks yet</div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* ── PLAYLIST ── */}
              {node.type === "playlist" && (
                <>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <ImageUploader value={coverImageUrl} onChange={setCoverImageUrl} onUpload={(f) => handleImageUpload(f, setCoverImageUrl)} />
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Songs</SectionHeader>
                    <FieldGroup className="p-0 overflow-hidden space-y-0">
                      {allNodes.filter((n) => n.type === "song").map((song) => (
                        <div key={song.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Music className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{song.title}</p>
                            {song.metadata?.artistName && <p className="text-xs text-muted-foreground truncate">{song.metadata.artistName}</p>}
                          </div>
                        </div>
                      ))}
                      {allNodes.filter((n) => n.type === "song").length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No songs yet</div>
                      )}
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* ── FOLDER ── */}
              {node.type === "folder" && (
                <div>
                  <SectionHeader>Preview Image</SectionHeader>
                  <FieldGroup>
                    <ImageUploader value={previewImage} onChange={setPreviewImage} onUpload={(f) => handleImageUpload(f, setPreviewImage)} />
                  </FieldGroup>
                  <SectionHeader>Display</SectionHeader>
                  <FieldGroup>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="split-screen"
                        checked={splitScreen}
                        onCheckedChange={setSplitScreen}
                      />
                      <Label htmlFor="split-screen" className="text-sm font-semibold">
                        Split screen layout
                      </Label>
                    </div>
                  </FieldGroup>
                </div>
              )}

              {/* ── PHOTO ALBUM ── */}
              {node.type === "photo_album" && (
                <div>
                  <SectionHeader>Photos</SectionHeader>
                  <FieldGroup className="space-y-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background">
                        <div className="w-14 h-14 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                          {photo.url
                            ? <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                          }
                        </div>
                        <Input placeholder="Caption (optional)" value={photo.caption || ""} onChange={(e) => { const u = [...photos]; u[i] = { ...u[i], caption: e.target.value }; setPhotos(u); }} className="flex-1 text-sm h-8" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        for (const file of Array.from(files)) {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch(`${"__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"}/api/upload/image`, { method: "POST", body: formData });
                          const data = await res.json();
                          setPhotos((prev) => [...prev, { url: data.url, caption: "", sortOrder: prev.length }]);
                        }
                      }} />
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <span data-testid="button-add-photos"><Plus className="h-4 w-4" />Add Photos</span>
                      </Button>
                    </label>
                  </FieldGroup>
                </div>
              )}

              {/* ── VIDEO ── */}
              {node.type === "video" && (
                <>
                  <div>
                    <SectionHeader>Video</SectionHeader>
                    <FieldGroup>
                      <Field label="Video URL">
                        <Input data-testid="input-video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
                      </Field>
                      <label className="cursor-pointer block">
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
                        <Button variant="outline" size="sm" asChild className="gap-2"><span data-testid="button-upload-video"><Upload className="h-3.5 w-3.5" />Upload Video File</span></Button>
                      </label>
                      <Field label="Duration" hint="In seconds">
                        <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="w-32" />
                      </Field>
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Thumbnail</SectionHeader>
                    <FieldGroup>
                      <ImageUploader value={videoThumbnailUrl} onChange={setVideoThumbnailUrl} onUpload={(f) => handleImageUpload(f, setVideoThumbnailUrl)} />
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* ── LINK ── */}
              {node.type === "link" && (
                <div>
                  <SectionHeader>Destination</SectionHeader>
                  <FieldGroup>
                    <Field label="URL">
                      <Input data-testid="input-link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                    </Field>
                  </FieldGroup>
                </div>
              )}

              {/* ── TEXT ── */}
              {node.type === "text" && (
                <>
                  <div>
                    <SectionHeader>Content</SectionHeader>
                    <FieldGroup>
                      <Field label="Body">
                        <Textarea data-testid="input-body-text" value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={8} placeholder="Write something wonderful…" className="resize-y text-sm leading-relaxed" />
                      </Field>
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Links</SectionHeader>
                    <FieldGroup>
                      <div className="space-y-2.5">
                        {links.map((link, i) => (
                          <div key={i} className="flex gap-2">
                            <Input value={link.label} onChange={(e) => { const u = [...links]; u[i] = { ...u[i], label: e.target.value }; setLinks(u); }} placeholder="Label" className="flex-1" />
                            <Input value={link.url} onChange={(e) => { const u = [...links]; u[i] = { ...u[i], url: e.target.value }; setLinks(u); }} placeholder="https://..." className="flex-1" />
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setLinks(links.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setLinks([...links, { label: "", url: "" }])} data-testid="button-add-link" className="gap-2">
                          <Plus className="h-3.5 w-3.5" />Add Link
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

      {/* Action bar */}
      <div className="shrink-0 border-t border-border bg-white/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-3">
        <Button
          size="default"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || isReadOnly}
          data-testid="button-save"
          className={cn("gap-2 px-6 bg-gradient-to-r border-0 shadow-sm hover:shadow-md transition-all", gradient, "from-opacity-90")}
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>

        {!isReadOnly && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="default" variant="ghost" data-testid="button-delete" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/8">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{node.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this node and all its children. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} data-testid="button-confirm-delete" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

// Need Settings icon inside the read-only section
import { Settings } from "lucide-react";

function ImageUploader({ value, onChange, onUpload }: { value: string; onChange: (url: string) => void; onUpload: (file: File) => void }) {
  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted group w-full max-w-xs">
          <img src={value} alt="" className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm" onClick={() => onChange("")} className="gap-2 shadow-lg">
              <X className="h-3.5 w-3.5" />Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          <div className="w-full rounded-xl border-2 border-dashed border-border/70 bg-muted/20 flex flex-col items-center gap-2.5 py-10 hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Click to upload</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG, GIF, WebP</p>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
