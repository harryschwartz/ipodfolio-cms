import { useState, useEffect, useRef } from "react";
import * as tus from "tus-js-client";
import heic2any from "heic2any";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Trash2,
  Save,
  Upload,
  Plus,
  X,
  Music,
  Search,
  ChevronRight,
  Globe,
  EyeOff,
  Check,
  GripVertical,
  Folder,
  Disc3,
  ListMusic,
  Image,
  Video,
  Link2,
  FileText,
  Settings,
  Gamepad2,
  Layers,
  Scissors,
  Pencil,
  ChevronDown,
  Loader2,
  CheckSquare,
  Square,
  ArrowRightLeft,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/audio-recorder";
import { AudioBadge } from "@/components/audio-badge";
import { AudioTrimmer } from "@/components/audio-trimmer";
import { ITunesSearchDialog } from "@/components/itunes-search-dialog";
import { MusicLibraryView, PlaylistEditorView, isMusicFolder, MUSIC_FOLDER_ID } from "@/components/music-library-view";
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
    <div className={cn("rounded-xl border border-border bg-white p-4 space-y-4 shadow-sm min-w-0 overflow-hidden", className)}>
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

/* ── Icon + style per child type ── */
const CHILD_TYPE_ICONS: Record<string, any> = {
  folder: Folder, song: Music, album: Disc3, playlist: ListMusic,
  photo_album: Image, video: Video, link: Link2, text: FileText,
  settings: Settings, game: Gamepad2, cover_flow_home: Layers, cover_flow_music: Layers,
};
const CHILD_ICON_STYLE: Record<string, string> = {
  folder: "bg-amber-100 text-amber-600", song: "bg-emerald-100 text-emerald-600",
  album: "bg-purple-100 text-purple-600", playlist: "bg-blue-100 text-blue-600",
  photo_album: "bg-pink-100 text-pink-600", video: "bg-red-100 text-red-600",
  link: "bg-cyan-100 text-cyan-600", text: "bg-slate-100 text-slate-600",
  settings: "bg-gray-100 text-gray-500", game: "bg-orange-100 text-orange-600",
  cover_flow_home: "bg-indigo-100 text-indigo-600", cover_flow_music: "bg-violet-100 text-violet-600",
};

/* ── ChildrenList: drag-reorder, thumbnails, tap-to-navigate, add ── */
function ChildrenList({
  parentId,
  children,
  label,
  onSelectNode,
  onAddNode,
}: {
  parentId: string;
  children: MenuNodeWithMetadata[];
  label: string;
  onSelectNode: (id: string) => void;
  onAddNode: (parentId: string | null) => void;
}) {
  const [items, setItems] = useState(children);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [itunesOpen, setItunesOpen] = useState(false);
  const touchRef = useRef<{ idx: number; startY: number; startTime: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes
  useEffect(() => { setItems(children); }, [children]);

  /* ── Persist reorder ── */
  const saveOrder = async (ordered: MenuNodeWithMetadata[]) => {
    const orderedIds = ordered.map((n) => n.id);
    try {
      await apiRequest("POST", `/api/nodes/${parentId}/reorder`, { orderedIds });
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    } catch { /* silent — items already visually updated */ }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    return next;
  };

  /* ── Mouse drag ── */
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDragIdx(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null) {
      const next = reorder(dragIdx, idx);
      if (next) saveOrder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  /* ── Touch drag (handle-only) ── */
  const handleGripTouchStart = (idx: number, e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    touchRef.current = { idx, startY: t.clientY, startTime: Date.now(), moved: false };
    setDragIdx(idx);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current || !listRef.current) return;
    const t = e.touches[0];
    const dy = Math.abs(t.clientY - touchRef.current.startY);
    if (dy > 5) touchRef.current.moved = true;
    if (!touchRef.current.moved) return;
    e.preventDefault();
    // Find which row we're over
    const rows = listRef.current.querySelectorAll<HTMLElement>("[data-child-idx]");
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (t.clientY >= rect.top && t.clientY <= rect.bottom) {
        const targetIdx = parseInt(row.dataset.childIdx!, 10);
        if (targetIdx !== touchRef.current.idx) {
          const next = reorder(touchRef.current.idx, targetIdx);
          touchRef.current.idx = targetIdx;
          setOverIdx(targetIdx);
          if (next) setItems(next);
        }
        break;
      }
    }
  };
  const handleTouchEnd = () => {
    if (touchRef.current?.moved) {
      saveOrder(items);
    }
    touchRef.current = null;
    setDragIdx(null);
    setOverIdx(null);
  };

  const CoverThumb = ({ node }: { node: MenuNodeWithMetadata }) => {
    const meta = node.metadata as any;
    const coverUrl = meta?.coverImageUrl;
    const emoji = meta?.coverEmoji;
    const color = meta?.coverColor;
    const Icon = CHILD_TYPE_ICONS[node.type] || FileText;
    const iconStyle = CHILD_ICON_STYLE[node.type] || "bg-gray-100 text-gray-500";

    if (coverUrl) {
      return <img src={coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border/50" />;
    }
    if (emoji) {
      return (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border border-border/50" style={{ backgroundColor: color || "#f3f4f6" }}>
          {emoji}
        </div>
      );
    }
    return (
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconStyle)}>
        <Icon className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionHeader>{label}</SectionHeader>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setItunesOpen(true)}>
            <Search className="h-3 w-3" />iTunes
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mr-1" onClick={() => onAddNode(parentId)}>
            <Plus className="h-3 w-3" />Add
          </Button>
        </div>
      </div>
      <ITunesSearchDialog
        open={itunesOpen}
        onOpenChange={setItunesOpen}
        parentId={parentId}
        existingChildCount={items.length}
      />
      <FieldGroup className="p-0 overflow-hidden space-y-0">
        <div ref={listRef} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No {label.toLowerCase()} yet</div>
          ) : (
            items.map((child, idx) => (
              <div
                key={child.id}
                data-child-idx={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 transition-colors cursor-pointer group",
                  dragIdx === idx && "opacity-40 scale-[1.02] shadow-md z-10 relative bg-white rounded-lg",
                  overIdx === idx && dragIdx !== idx && "bg-indigo-50",
                )}
                onClick={() => {
                  // Only navigate if we didn't just finish a touch drag
                  if (!touchRef.current?.moved) onSelectNode(child.id);
                }}
              >
                <div
                  className="flex items-center justify-center w-8 h-10 -ml-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties}
                  onTouchStart={(e) => handleGripTouchStart(idx, e)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                </div>
                <CoverThumb node={child} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{child.title}</p>
                  {child.metadata?.artistName && <p className="text-xs text-muted-foreground truncate">{(child.metadata as any).artistName}</p>}
                </div>
                {(child.metadata as any)?.audioUrl && (
                  <AudioBadge
                    audioUrl={(child.metadata as any).audioUrl}
                    duration={(child.metadata as any)?.duration}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const endpoint = child.status === "published" ? "unpublish" : "publish";
                    apiRequest("POST", `/api/nodes/${child.id}/${endpoint}`).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
                    });
                  }}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-1 rounded-full text-[10px] font-semibold transition-all flex-shrink-0",
                    child.status === "published"
                      ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      : "text-muted-foreground bg-muted/50 hover:bg-muted"
                  )}
                  title={child.status === "published" ? "Published — tap to unpublish" : "Draft — tap to publish"}
                >
                  {child.status === "published" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </button>
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">{TYPE_LABELS[child.type] || child.type}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </FieldGroup>
    </div>
  );
}

/** Photo grid with large thumbnails, drag-to-reorder, select mode, and delete */
function PhotoGrid({
  photos,
  setPhotos,
  photoListRef,
  photoDragIdx,
  photoOverIdx,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTouchMove,
  onTouchEnd,
  onGripTouchStart,
  uploadingPhotos,
  uploadProgress,
  isDraggingOver,
  onFileDrop,
  selectMode,
  selectedIndices,
  onToggleSelect,
}: {
  photos: Array<{ url: string; caption?: string; sortOrder: number }>;
  setPhotos: React.Dispatch<React.SetStateAction<Array<{ url: string; caption?: string; sortOrder: number }>>>;
  photoListRef: React.RefObject<HTMLDivElement>;
  photoDragIdx: number | null;
  photoOverIdx: number | null;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onGripTouchStart: (idx: number, e: React.TouchEvent) => void;
  uploadingPhotos: boolean;
  uploadProgress: number;
  isDraggingOver: boolean;
  onFileDrop: (files: File[]) => Promise<void>;
  selectMode: boolean;
  selectedIndices: Set<number>;
  onToggleSelect: (idx: number) => void;
}) {
  return (
    <>
      <div
        ref={photoListRef}
        onTouchMove={selectMode ? undefined : onTouchMove}
        onTouchEnd={selectMode ? undefined : onTouchEnd}
        className="grid grid-cols-3 gap-1 p-1"
      >
        {photos.map((photo, i) => {
          const isSelected = selectedIndices.has(i);
          return (
            <div
              key={`photo-${i}`}
              data-photo-idx={i}
              draggable={!selectMode}
              onDragStart={selectMode ? undefined : (e) => onDragStart(e, i)}
              onDragOver={selectMode ? undefined : (e) => onDragOver(e, i)}
              onDrop={selectMode ? undefined : (e) => onDrop(e, i)}
              onDragEnd={selectMode ? undefined : onDragEnd}
              onClick={selectMode ? () => onToggleSelect(i) : undefined}
              className={cn(
                "relative aspect-square bg-muted rounded-lg overflow-hidden group transition-all",
                selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                !selectMode && photoDragIdx === i && "opacity-40 scale-95 ring-2 ring-primary/40",
                !selectMode && photoOverIdx === i && photoDragIdx !== i && "ring-2 ring-primary/60 scale-105",
                selectMode && isSelected && "ring-3 ring-blue-500 ring-offset-1",
              )}
            >
              {photo.url ? (
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {/* Select mode: checkbox overlay */}
              {selectMode && (
                <div className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-black/40 border-2 border-white/80" />
                  )}
                </div>
              )}
              {/* Grip handle overlay (hidden in select mode) */}
              {!selectMode && (
                <div
                  className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-center pt-1"
                  style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties}
                  onTouchStart={(e) => onGripTouchStart(i, e)}
                >
                  <GripVertical className="h-4 w-4 text-white drop-shadow-sm" />
                </div>
              )}
              {/* Delete button overlay (hidden in select mode) */}
              {!selectMode && (
                <button
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setPhotos(photos.filter((_, j) => j !== i)); }}
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              )}
              {/* Index badge (hidden in select mode) */}
              {!selectMode && (
                <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                </div>
              )}
              {/* Dimming overlay for selected photos */}
              {selectMode && isSelected && (
                <div className="absolute inset-0 bg-blue-500/15 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
      {uploadingPhotos ? (
        <div className="p-3">
          <div className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 rounded-lg px-4 py-6">
            <div className="max-w-xs mx-auto">
              <UploadProgressBar progress={uploadProgress} label="Uploading photos..." />
            </div>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block p-3">
          <input type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={async (e) => {
            const files = e.target.files;
            if (!files) return;
            await onFileDrop(Array.from(files));
          }} />
          <div className={cn(
            "border-2 border-dashed rounded-lg px-4 py-6 text-center text-sm transition-colors",
            isDraggingOver
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-border text-muted-foreground hover:border-indigo-400 hover:bg-indigo-50/50"
          )}>
            <Upload className="h-5 w-5 mx-auto mb-2 opacity-40" />
            <span>{isDraggingOver ? "Drop to upload" : <>Drop photos here or <span className="text-indigo-600 font-medium">browse</span></>}</span>
          </div>
        </label>
      )}
    </>
  );
}

/** Modal dialog for picking a destination album to move photos to */
function MovePhotosDialog({
  open,
  onOpenChange,
  allNodes,
  currentNodeId,
  selectedCount,
  onMove,
  moving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allNodes: MenuNodeWithMetadata[];
  currentNodeId: string;
  selectedCount: number;
  onMove: (destinationNodeId: string) => void;
  moving: boolean;
}) {
  // Find all nodes that can hold photos: photo_album, folder, settings
  const destinations = allNodes.filter(
    (n) =>
      n.id !== currentNodeId &&
      (n.type === "photo_album" || n.type === "folder" || n.type === "settings")
  );

  // Build parent title lookup
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const getParentTitle = (n: MenuNodeWithMetadata) => {
    if (!n.parentId) return null;
    return nodeMap.get(n.parentId)?.title || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Move {selectedCount} photo{selectedCount !== 1 ? "s" : ""} to...</DialogTitle>
          <DialogDescription>
            Choose a destination album or folder.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {destinations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No other albums or folders available.</p>
            ) : (
              destinations.map((dest) => {
                const parentTitle = getParentTitle(dest);
                const photoCount = (dest.metadata?.photos as any)?.length || 0;
                const Icon = CHILD_TYPE_ICONS[dest.type] || Image;
                const iconStyle = CHILD_ICON_STYLE[dest.type] || "bg-pink-100 text-pink-600";
                return (
                  <button
                    key={dest.id}
                    disabled={moving}
                    onClick={() => onMove(dest.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 transition-colors text-left disabled:opacity-50"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconStyle)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {parentTitle && (
                          <span className="text-muted-foreground">{parentTitle} &rsaquo; </span>
                        )}
                        {dest.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[dest.type] || dest.type}
                        {photoCount > 0 && ` · ${photoCount} photo${photoCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function NodeEditor({
  node,
  allNodes,
  onSelectNode,
  onAddNode,
}: {
  node: MenuNodeWithMetadata;
  allNodes: MenuNodeWithMetadata[];
  onSelectNode: (id: string) => void;
  onAddNode: (parentId: string | null) => void;
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
  const [coverImagePosition, setCoverImagePosition] = useState((node.metadata as any)?.coverImagePosition || "50% 50%");
  const [coverImageZoom, setCoverImageZoom] = useState(parseFloat((node.metadata as any)?.coverImageZoom) || 1);
  const [coverEmoji, setCoverEmoji] = useState((node.metadata as any)?.coverEmoji || "");
  const [coverColor, setCoverColor] = useState((node.metadata as any)?.coverColor || "#6366f1");
  const [coverMode, setCoverMode] = useState<"image" | "emoji">((node.metadata as any)?.coverEmoji ? "emoji" : "image");
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [transcription, setTranscription] = useState<any>(node.metadata?.transcription || null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  const dragCounter = useRef(0);

  /* ── Photo reorder state ── */
  const [photoDragIdx, setPhotoDragIdx] = useState<number | null>(null);
  const [photoOverIdx, setPhotoOverIdx] = useState<number | null>(null);
  const photoTouchRef = useRef<{ idx: number; startY: number; moved: boolean } | null>(null);
  const photoListRef = useRef<HTMLDivElement>(null);

  /* ── Photo select & move state ── */
  const [photoSelectMode, setPhotoSelectMode] = useState(false);
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<Set<number>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingPhotos, setMovingPhotos] = useState(false);

  const reorderPhotos = (from: number, to: number) => {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Re-index sortOrder
    next.forEach((p, i) => (p.sortOrder = i));
    setPhotos(next);
    return next;
  };

  const handlePhotoDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    setPhotoDragIdx(idx);
  };
  const handlePhotoDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setPhotoOverIdx(idx);
  };
  const handlePhotoDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (photoDragIdx !== null) reorderPhotos(photoDragIdx, idx);
    setPhotoDragIdx(null);
    setPhotoOverIdx(null);
  };
  const handlePhotoDragEnd = () => { setPhotoDragIdx(null); setPhotoOverIdx(null); };

  const handlePhotoGripTouchStart = (idx: number, e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    photoTouchRef.current = { idx, startY: t.clientY, moved: false };
    setPhotoDragIdx(idx);
  };
  const handlePhotoTouchMove = (e: React.TouchEvent) => {
    if (!photoTouchRef.current || !photoListRef.current) return;
    const t = e.touches[0];
    const dy = Math.abs(t.clientY - photoTouchRef.current.startY);
    if (dy > 5) photoTouchRef.current.moved = true;
    if (!photoTouchRef.current.moved) return;
    e.preventDefault();
    const rows = photoListRef.current.querySelectorAll<HTMLElement>("[data-photo-idx]");
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (t.clientY >= rect.top && t.clientY <= rect.bottom) {
        const targetIdx = parseInt(row.dataset.photoIdx!, 10);
        if (targetIdx !== photoTouchRef.current.idx) {
          reorderPhotos(photoTouchRef.current.idx, targetIdx);
          photoTouchRef.current.idx = targetIdx;
          setPhotoOverIdx(targetIdx);
        }
        break;
      }
    }
  };
  const handlePhotoTouchEnd = () => {
    photoTouchRef.current = null;
    setPhotoDragIdx(null);
    setPhotoOverIdx(null);
  };

  const togglePhotoSelect = (idx: number) => {
    setSelectedPhotoIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPhotoIndices(new Set(photos.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedPhotoIndices(new Set());
  };

  const exitSelectMode = () => {
    setPhotoSelectMode(false);
    setSelectedPhotoIndices(new Set());
  };

  const handleMovePhotos = async (destinationNodeId: string) => {
    const selected = Array.from(selectedPhotoIndices).sort((a, b) => a - b);
    if (selected.length === 0) return;

    setMovingPhotos(true);
    try {
      // Fetch the destination node's current state
      const destRes = await apiRequest("GET", `/api/nodes/${destinationNodeId}`);
      const destNode: MenuNodeWithMetadata = await destRes.json();
      const destPhotos: Array<{ url: string; caption?: string; sortOrder: number }> =
        (destNode.metadata?.photos as any) || [];

      // Gather selected photos
      const photosToMove = selected.map((i) => photos[i]);

      // Append to destination with correct sortOrder
      const newDestPhotos = [
        ...destPhotos,
        ...photosToMove.map((p, i) => ({ ...p, sortOrder: destPhotos.length + i })),
      ];

      // Save destination node
      await apiRequest("PATCH", `/api/nodes/${destinationNodeId}`, {
        metadata: { photos: newDestPhotos.length > 0 ? newDestPhotos : null },
      });

      // Remove selected photos from current node
      const remaining = photos.filter((_, i) => !selectedPhotoIndices.has(i));
      remaining.forEach((p, i) => (p.sortOrder = i));
      setPhotos(remaining);

      // Save current node
      await apiRequest("PATCH", `/api/nodes/${node.id}`, {
        title,
        metadata: buildMetadata({ photos: remaining.length > 0 ? remaining : null }),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });

      const destTitle = destNode.title;
      toast({
        title: "Photos moved",
        description: `Moved ${selected.length} photo${selected.length !== 1 ? "s" : ""} to "${destTitle}".`,
      });

      setMoveDialogOpen(false);
      exitSelectMode();
    } catch (err: any) {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
    } finally {
      setMovingPhotos(false);
    }
  };

  // Prevent browser from opening dragged files as a new tab,
  // and handle drops anywhere on the page when editing a photo album
  const handleFileDrop = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!imageFiles.length) return;
    setUploadingPhotos(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const { blob, ext } = await convertHeicToJpeg(imageFiles[i]);
        const url = await uploadToSupabase(blob, ext, (pct) => {
          const base = Math.round((i / imageFiles.length) * 100);
          const slice = Math.round(pct / imageFiles.length);
          setUploadProgress(base + slice);
        });
        setPhotos((prev) => [...prev, { url, caption: "", sortOrder: prev.length }]);
      }
      toast({ title: "Photos uploaded", description: `${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""} added.` });
    } catch (err: any) {
      toast({ title: "Photo upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhotos(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    if (node.type !== "photo_album" && node.type !== "folder" && node.type !== "settings") return;
    const prevent = (e: DragEvent) => e.preventDefault();
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounter.current++;
      setIsDraggingOver(true);
    };
    const onDragLeave = () => {
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDraggingOver(false);
    };
    const onDrop = (e: DragEvent) => {
      dragCounter.current = 0;
      setIsDraggingOver(false);
      if (e.dataTransfer?.files.length) {
        handleFileDrop(Array.from(e.dataTransfer.files));
      }
    };
    document.addEventListener("dragover", prevent);
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", prevent);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", prevent);
      document.removeEventListener("drop", onDrop);
    };
  }, [node.type]);

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
    setCoverImagePosition((node.metadata as any)?.coverImagePosition || "50% 50%");
    setCoverImageZoom(parseFloat((node.metadata as any)?.coverImageZoom) || 1);
    setCoverEmoji((node.metadata as any)?.coverEmoji || "");
    setCoverColor((node.metadata as any)?.coverColor || "#6366f1");
    setCoverMode((node.metadata as any)?.coverEmoji ? "emoji" : "image");
    setPreviewImage(node.metadata?.previewImage || "");
    setSplitScreen(node.metadata?.splitScreen ?? false);
    setVideoThumbnailUrl(node.metadata?.videoThumbnailUrl || "");
    setDuration(node.metadata?.duration || 0);
    setLinks((node.metadata?.links as any) || []);
    setPhotos((node.metadata?.photos as any) || []);
    setShowTrimmer(false);
    setEditingCover(false);
    setTranscription(node.metadata?.transcription || null);
    setTranscribing(false);
    setTranscriptionOpen(false);
    setPhotoSelectMode(false);
    setSelectedPhotoIndices(new Set());
  }

  /* ── Build metadata payload (with optional overrides) ── */
  const buildMetadata = (overrides: Record<string, any> = {}) => ({
    artistName: artistName || null,
    albumName: albumName || null,
    audioUrl: audioUrl || null,
    videoUrl: videoUrl || null,
    linkUrl: linkUrl || null,
    bodyText: bodyText || null,
    coverImageUrl: coverMode === "image" ? (coverImageUrl || null) : null,
    coverImagePosition: coverMode === "image" && coverImageUrl ? coverImagePosition : null,
    coverImageZoom: coverMode === "image" && coverImageUrl ? String(coverImageZoom) : null,
    coverEmoji: coverMode === "emoji" ? (coverEmoji || null) : null,
    coverColor: coverMode === "emoji" ? (coverColor || null) : null,
    previewImage: previewImage || null,
    splitScreen: splitScreen ?? null,
    videoThumbnailUrl: videoThumbnailUrl || null,
    duration: duration || null,
    links: links.length > 0 ? links : null,
    photos: photos.length > 0 ? photos : null,
    transcription: transcription || null,
    ...overrides,
  });

  /* ── Auto-save helper (PATCH without full-page save) ── */
  const autoSave = async (metadataOverrides: Record<string, any> = {}) => {
    try {
      await apiRequest("PATCH", `/api/nodes/${node.id}`, {
        title,
        metadata: buildMetadata(metadataOverrides),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    } catch { /* silent — user can still hit Save manually */ }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/nodes/${node.id}`, {
        title,
        metadata: buildMetadata(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
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

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB bucket limit
  const STANDARD_UPLOAD_LIMIT = 50 * 1024 * 1024; // 50MB - Supabase standard upload limit

  const uploadToSupabase = async (
    file: File | Blob,
    ext: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    const SUPABASE_URL = "https://xtjjavrixvnwoulgebqp.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amphdnJpeHZud291bGdlYnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjgxNjIsImV4cCI6MjA4OTU0NDE2Mn0.aSL3bi4__sS1OaeF2_MkTMrOGfHmnHBKxhKP8zd0qAQ";
    const BUCKET = "cms-assets";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const rawType = file.type || (file instanceof File ? file.type : `application/octet-stream`);
    const contentType = rawType.split(";")[0] || `application/octet-stream`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File is too large. Maximum size is 500MB (your file is ${Math.round(file.size / 1024 / 1024)}MB).`);
    }

    // Use TUS resumable upload for files > 50MB, standard upload otherwise
    if (file.size > STANDARD_UPLOAD_LIMIT) {
      return new Promise<string>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024, // 6MB chunks
          headers: {
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "x-upsert": "true",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: BUCKET,
            objectName: path,
            contentType,
            cacheControl: "3600",
          },
          onError(err) {
            const msg = err.message || "";
            if (msg.includes("413") || msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("payload")) {
              reject(new Error("File is too large. Maximum size is 500MB."));
            } else {
              reject(new Error(`Upload failed: ${msg}`));
            }
          },
          onProgress(bytesUploaded, bytesTotal) {
            if (onProgress) {
              onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
            }
          },
          onSuccess() {
            resolve(publicUrl);
          },
        });
        upload.findPreviousUploads().then((prev) => {
          if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
          upload.start();
        });
      });
    }

    // Standard upload for files <= 50MB
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.setRequestHeader("x-upsert", "true");
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(publicUrl);
        } else if (xhr.status === 413) {
          reject(new Error("File is too large. Maximum size is 500MB."));
        } else {
          reject(new Error(`Upload failed: ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed: network error"));
      xhr.send(file);
    });
  };

  const convertHeicToJpeg = async (file: File): Promise<{ blob: Blob; ext: string }> => {
    const isHeic = /heic|heif/i.test(file.name.split(".").pop() || "") || /heic|heif/i.test(file.type);
    if (!isHeic) return { blob: file, ext: file.name.split(".").pop() || "jpg" };
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return { blob: Array.isArray(converted) ? converted[0] : converted, ext: "jpg" };
  };

  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
    const { blob, ext } = await convertHeicToJpeg(file);
    setter(await uploadToSupabase(blob, ext));
  };

  const handleAudioUpload = async (file: File | Blob) => {
    let ext: string;
    if (file instanceof File) {
      ext = file.name.split(".").pop() || "webm";
    } else {
      const mimeMap: Record<string, string> = {
        "audio/mp4": "m4a", "audio/aac": "aac", "audio/ogg": "ogg",
        "audio/ogg;codecs=opus": "ogg", "audio/wav": "wav",
        "audio/webm": "webm", "audio/webm;codecs=opus": "webm",
      };
      ext = mimeMap[file.type] || "webm";
    }
    setUploadingAudio(true);
    setUploadProgress(0);
    try {
      const newUrl = await uploadToSupabase(file, ext, setUploadProgress);
      setAudioUrl(newUrl);
      await autoSave({ audioUrl: newUrl });
      toast({ title: "Audio uploaded", description: "Audio file saved successfully." });
      // Kick off transcription in the background (don't await — non-blocking)
      transcribeAudio(newUrl);
    } catch (err: any) {
      toast({ title: "Audio upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAudio(false);
      setUploadProgress(0);
    }
  };

  /* ── Transcribe audio in the background ── */
  const transcribeAudio = async (audioFileUrl: string) => {
    const SUPABASE_URL = "https://xtjjavrixvnwoulgebqp.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amphdnJpeHZud291bGdlYnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjgxNjIsImV4cCI6MjA4OTU0NDE2Mn0.aSL3bi4__sS1OaeF2_MkTMrOGfHmnHBKxhKP8zd0qAQ";

    setTranscribing(true);
    try {
      // 1. Call the transcription Edge Function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio_url: audioFileUrl }),
      });
      if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
      const data = await res.json();

      // 2. Store transcription on the node
      setTranscription(data);
      await autoSave({ transcription: data });

      // 3. Find or create the "i prefer to read 🤓" folder as sibling of this song
      const parentId = node.parentId;
      const FOLDER_TITLE = "i prefer to read 🤓";

      // Fetch current siblings to check if folder already exists
      const allRes = await apiRequest("GET", "/api/nodes");
      const allCurrentNodes: MenuNodeWithMetadata[] = await allRes.json();
      let readFolder = allCurrentNodes.find(
        (n) => n.parentId === parentId && n.type === "folder" && n.title === FOLDER_TITLE
      );

      if (!readFolder) {
        // Create the folder
        const siblings = allCurrentNodes.filter((n) => n.parentId === parentId);
        const maxSort = siblings.reduce((max, n) => Math.max(max, n.sortOrder), -1);
        const createRes = await apiRequest("POST", "/api/nodes", {
          parentId,
          type: "folder",
          title: FOLDER_TITLE,
          sortOrder: maxSort + 1,
          status: "published",
          metadata: {},
        });
        readFolder = await createRes.json();
      }

      // 4. Create a text node inside the folder with the transcription text
      if (readFolder) {
        const folderChildren = allCurrentNodes.filter((n) => n.parentId === readFolder!.id);
        const maxChildSort = folderChildren.reduce((max, n) => Math.max(max, n.sortOrder), -1);
        await apiRequest("POST", "/api/nodes", {
          parentId: readFolder.id,
          type: "text",
          title: node.title,
          sortOrder: maxChildSort + 1,
          status: "published",
          metadata: { bodyText: data.text },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Transcription complete", description: "Audio has been transcribed and a text version was created." });
    } catch (err: any) {
      console.error("Transcription error:", err);
      toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
    } finally {
      setTranscribing(false);
    }
  };

  /* ── Cover image upload: upload then auto-enter edit mode ── */
  const handleCoverImageUpload = async (file: File) => {
    const { blob, ext } = await convertHeicToJpeg(file);
    const url = await uploadToSupabase(blob, ext);
    setCoverImageUrl(url);
    setEditingCover(true);
  };

  const isUploading = uploadingVideo || uploadingAudio || uploadingPhotos;

  /* ── Cover edit toggle: entering edit = just toggle; exiting ("Done") = auto-save ── */
  const handleCoverEditChange = (editing: boolean) => {
    setEditingCover(editing);
    if (!editing) {
      // "Done" pressed — auto-save cover changes
      autoSave();
    }
  };

  const handleVideoUpload = async (file: File) => {
    const ext = file.name.split(".").pop() || "mp4";
    setUploadingVideo(true);
    setUploadProgress(0);
    try {
      const newUrl = await uploadToSupabase(file, ext, setUploadProgress);
      setVideoUrl(newUrl);
      await autoSave({ videoUrl: newUrl });
      toast({ title: "Video uploaded", description: "Video file saved successfully." });
    } catch (err: any) {
      toast({ title: "Video upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const isReadOnly = ["cover_flow_home", "cover_flow_music"].includes(node.type);
  const parentNode = node.parentId ? allNodes.find((n) => n.id === node.parentId) : null;
  const gradient = TYPE_GRADIENT[node.type] || "from-indigo-500 to-violet-500";
  const headerBg = TYPE_HEADER_BG[node.type] || "bg-gradient-to-r from-indigo-50 to-violet-50";

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full max-w-full">
      {/* Colored gradient accent stripe */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r flex-shrink-0", gradient)} />

      {/* Header */}
      <div className={cn("shrink-0 px-4 md:px-6 pt-4 pb-5 border-b border-border", headerBg)}>
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

      <ScrollArea className="flex-1 min-h-0 bg-background">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-8 space-y-6 overflow-x-hidden">

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
                      <CoverArtPicker
                        mode={coverMode}
                        onModeChange={setCoverMode}
                        imageUrl={coverImageUrl}
                        onImageChange={setCoverImageUrl}
                        onImageUpload={handleCoverImageUpload}
                        imagePosition={coverImagePosition}
                        onImagePositionChange={setCoverImagePosition}
                        imageZoom={coverImageZoom}
                        onImageZoomChange={setCoverImageZoom}
                        emoji={coverEmoji}
                        onEmojiChange={setCoverEmoji}
                        color={coverColor}
                        onColorChange={setCoverColor}
                        editing={editingCover}
                        onEditChange={handleCoverEditChange}
                      />
                    </FieldGroup>
                  </div>
                  <div>
                    <SectionHeader>Audio</SectionHeader>
                    <FieldGroup>
                      {audioUrl ? (
                        <div className="space-y-3">
                          {showTrimmer ? (
                            <AudioTrimmer
                              audioUrl={audioUrl}
                              onTrimComplete={async (blob, trimDuration) => {
                                setShowTrimmer(false);
                                setDuration(Math.round(trimDuration));
                                await handleAudioUpload(new File([blob], "trimmed.wav", { type: "audio/wav" }));
                              }}
                              onCancel={() => setShowTrimmer(false)}
                            />
                          ) : (
                            <>
                              <audio controls src={audioUrl} className="w-full" />
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setShowTrimmer(true)} className="gap-2">
                                  <Scissors className="h-3.5 w-3.5" />Trim
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setAudioUrl("")} data-testid="button-remove-audio" className="gap-2 text-destructive hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />Remove
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {uploadingAudio ? (
                            <div className="w-full rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 flex flex-col items-center gap-3 py-8">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
                                <Music className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div className="w-48">
                                <UploadProgressBar progress={uploadProgress} label="Uploading audio…" />
                              </div>
                            </div>
                          ) : (
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
                          )}
                          <div className="relative flex items-center gap-3">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-xs text-muted-foreground font-medium">or record in browser</span>
                            <div className="flex-1 border-t border-border" />
                          </div>
                          <AudioRecorder onRecordingComplete={(blob) => {
                            // Derive extension from actual MIME type (iOS uses mp4, Chrome uses webm)
                            const mimeToExt: Record<string, string> = {
                              "audio/webm": "webm",
                              "audio/webm;codecs=opus": "webm",
                              "audio/mp4": "m4a",
                              "audio/aac": "aac",
                              "audio/ogg": "ogg",
                              "audio/ogg;codecs=opus": "ogg",
                              "audio/wav": "wav",
                            };
                            const ext = mimeToExt[blob.type] || "webm";
                            handleAudioUpload(new File([blob], `recording.${ext}`, { type: blob.type }));
                          }} />
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                  {/* ── Transcription ── */}
                  {(transcription || transcribing) && (
                    <div>
                      <SectionHeader>Transcription</SectionHeader>
                      <FieldGroup>
                        {transcribing ? (
                          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Transcribing...
                          </div>
                        ) : transcription ? (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => setTranscriptionOpen(!transcriptionOpen)}
                              className="flex items-center gap-2 text-sm font-medium text-foreground/75 hover:text-foreground transition-colors w-full text-left"
                            >
                              <ChevronDown className={cn("h-4 w-4 transition-transform", transcriptionOpen && "rotate-180")} />
                              {transcriptionOpen ? "Hide transcription" : "Show transcription"}
                              {transcription.duration && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {Math.floor(transcription.duration / 60)}:{String(Math.floor(transcription.duration % 60)).padStart(2, "0")}
                                </span>
                              )}
                            </button>
                            {transcriptionOpen && (
                              <Textarea
                                value={transcription.text || ""}
                                onChange={(e) => setTranscription({ ...transcription, text: e.target.value })}
                                rows={8}
                                placeholder="Transcription text..."
                                className="resize-y text-sm leading-relaxed"
                              />
                            )}
                          </div>
                        ) : null}
                      </FieldGroup>
                    </div>
                  )}
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
                      <CoverArtPicker
                        mode={coverMode}
                        onModeChange={setCoverMode}
                        imageUrl={coverImageUrl}
                        onImageChange={setCoverImageUrl}
                        onImageUpload={handleCoverImageUpload}
                        imagePosition={coverImagePosition}
                        onImagePositionChange={setCoverImagePosition}
                        imageZoom={coverImageZoom}
                        onImageZoomChange={setCoverImageZoom}
                        emoji={coverEmoji}
                        onEmojiChange={setCoverEmoji}
                        color={coverColor}
                        onColorChange={setCoverColor}
                        editing={editingCover}
                        onEditChange={handleCoverEditChange}
                      />
                    </FieldGroup>
                  </div>
                  <ChildrenList
                    parentId={node.id}
                    children={allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                    label="Tracks"
                    onSelectNode={onSelectNode}
                    onAddNode={onAddNode}
                  />
                </>
              )}

              {/* ── PLAYLIST ── */}
              {node.type === "playlist" && (
                <>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <CoverArtPicker
                        mode={coverMode}
                        onModeChange={setCoverMode}
                        imageUrl={coverImageUrl}
                        onImageChange={setCoverImageUrl}
                        onImageUpload={handleCoverImageUpload}
                        imagePosition={coverImagePosition}
                        onImagePositionChange={setCoverImagePosition}
                        imageZoom={coverImageZoom}
                        onImageZoomChange={setCoverImageZoom}
                        emoji={coverEmoji}
                        onEmojiChange={setCoverEmoji}
                        color={coverColor}
                        onColorChange={setCoverColor}
                        editing={editingCover}
                        onEditChange={handleCoverEditChange}
                      />
                    </FieldGroup>
                  </div>
                  {node.parentId === MUSIC_FOLDER_ID ? (
                    <PlaylistEditorView node={node} allNodes={allNodes} onSelectNode={onSelectNode} />
                  ) : (
                    <ChildrenList
                      parentId={node.id}
                      children={allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                      label="Songs"
                      onSelectNode={onSelectNode}
                      onAddNode={onAddNode}
                    />
                  )}
                </>
              )}

              {/* ── GAME ── */}
              {node.type === "game" && (
                <>
                  <div>
                    <SectionHeader>Cover Art</SectionHeader>
                    <FieldGroup>
                      <CoverArtPicker
                        mode={coverMode}
                        onModeChange={setCoverMode}
                        imageUrl={coverImageUrl}
                        onImageChange={setCoverImageUrl}
                        onImageUpload={handleCoverImageUpload}
                        imagePosition={coverImagePosition}
                        onImagePositionChange={setCoverImagePosition}
                        imageZoom={coverImageZoom}
                        onImageZoomChange={setCoverImageZoom}
                        emoji={coverEmoji}
                        onEmojiChange={setCoverEmoji}
                        color={coverColor}
                        onColorChange={setCoverColor}
                        editing={editingCover}
                        onEditChange={handleCoverEditChange}
                      />
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* ── SETTINGS ── */}
              {node.type === "settings" && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <SectionHeader>Photos</SectionHeader>
                      {photos.length > 0 && (
                        <Button
                          size="sm"
                          variant={photoSelectMode ? "default" : "outline"}
                          className="h-7 text-xs gap-1.5"
                          onClick={() => photoSelectMode ? exitSelectMode() : setPhotoSelectMode(true)}
                        >
                          {photoSelectMode ? <><X className="h-3 w-3" /> Cancel</> : <><CheckSquare className="h-3 w-3" /> Select</>}
                        </Button>
                      )}
                    </div>
                    {photoSelectMode && (
                      <div className="flex items-center gap-2 mb-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSelectAll}>Select All</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDeselectAll}>Deselect All</Button>
                        <span className="text-xs text-muted-foreground ml-auto">{selectedPhotoIndices.size} selected</span>
                        {selectedPhotoIndices.size > 0 && (
                          <Button size="sm" className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setMoveDialogOpen(true)}>
                            <ArrowRightLeft className="h-3 w-3" /> Move to Album
                          </Button>
                        )}
                      </div>
                    )}
                    <FieldGroup className="p-0 overflow-hidden space-y-0">
                      <PhotoGrid
                        photos={photos}
                        setPhotos={setPhotos}
                        photoListRef={photoListRef}
                        photoDragIdx={photoDragIdx}
                        photoOverIdx={photoOverIdx}
                        onDragStart={handlePhotoDragStart}
                        onDragOver={handlePhotoDragOver}
                        onDrop={handlePhotoDrop}
                        onDragEnd={handlePhotoDragEnd}
                        onTouchMove={handlePhotoTouchMove}
                        onTouchEnd={handlePhotoTouchEnd}
                        onGripTouchStart={handlePhotoGripTouchStart}
                        uploadingPhotos={uploadingPhotos}
                        uploadProgress={uploadProgress}
                        isDraggingOver={isDraggingOver}
                        onFileDrop={handleFileDrop}
                        selectMode={photoSelectMode}
                        selectedIndices={selectedPhotoIndices}
                        onToggleSelect={togglePhotoSelect}
                      />
                    </FieldGroup>
                  </div>
                  <ChildrenList
                    parentId={node.id}
                    children={allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                    label="Children"
                    onSelectNode={onSelectNode}
                    onAddNode={onAddNode}
                  />
                </>
              )}

              {/* ── FOLDER ── */}
              {node.type === "folder" && (
                <>
                  {isMusicFolder(node.id) ? (
                    /* Music folder gets a special library-style UI */
                    <MusicLibraryView node={node} allNodes={allNodes} onSelectNode={onSelectNode} />
                  ) : (
                    <>
                      <div>
                        <SectionHeader>Preview Image</SectionHeader>
                        <FieldGroup>
                          <ImageUploader value={previewImage} onChange={setPreviewImage} onUpload={(f) => handleImageUpload(f, setPreviewImage)} />
                        </FieldGroup>
                        <div className="mt-6">
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
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <SectionHeader>Photos</SectionHeader>
                          {photos.length > 0 && (
                            <Button
                              size="sm"
                              variant={photoSelectMode ? "default" : "outline"}
                              className="h-7 text-xs gap-1.5"
                              onClick={() => photoSelectMode ? exitSelectMode() : setPhotoSelectMode(true)}
                            >
                              {photoSelectMode ? <><X className="h-3 w-3" /> Cancel</> : <><CheckSquare className="h-3 w-3" /> Select</>}
                            </Button>
                          )}
                        </div>
                        {photoSelectMode && (
                          <div className="flex items-center gap-2 mb-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSelectAll}>Select All</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDeselectAll}>Deselect All</Button>
                            <span className="text-xs text-muted-foreground ml-auto">{selectedPhotoIndices.size} selected</span>
                            {selectedPhotoIndices.size > 0 && (
                              <Button size="sm" className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setMoveDialogOpen(true)}>
                                <ArrowRightLeft className="h-3 w-3" /> Move to Album
                              </Button>
                            )}
                          </div>
                        )}
                        <FieldGroup className="p-0 overflow-hidden space-y-0">
                          <PhotoGrid
                            photos={photos}
                            setPhotos={setPhotos}
                            photoListRef={photoListRef}
                            photoDragIdx={photoDragIdx}
                            photoOverIdx={photoOverIdx}
                            onDragStart={handlePhotoDragStart}
                            onDragOver={handlePhotoDragOver}
                            onDrop={handlePhotoDrop}
                            onDragEnd={handlePhotoDragEnd}
                            onTouchMove={handlePhotoTouchMove}
                            onTouchEnd={handlePhotoTouchEnd}
                            onGripTouchStart={handlePhotoGripTouchStart}
                            uploadingPhotos={uploadingPhotos}
                            uploadProgress={uploadProgress}
                            isDraggingOver={isDraggingOver}
                            onFileDrop={handleFileDrop}
                            selectMode={photoSelectMode}
                            selectedIndices={selectedPhotoIndices}
                            onToggleSelect={togglePhotoSelect}
                          />
                        </FieldGroup>
                      </div>
                      <ChildrenList
                        parentId={node.id}
                        children={allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                        label="Children"
                        onSelectNode={onSelectNode}
                        onAddNode={onAddNode}
                      />
                    </>
                  )}
                </>
              )}

              {/* ── PHOTO ALBUM ── */}
              {node.type === "photo_album" && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <SectionHeader>Photos</SectionHeader>
                      {photos.length > 0 && (
                        <Button
                          size="sm"
                          variant={photoSelectMode ? "default" : "outline"}
                          className="h-7 text-xs gap-1.5"
                          onClick={() => photoSelectMode ? exitSelectMode() : setPhotoSelectMode(true)}
                        >
                          {photoSelectMode ? <><X className="h-3 w-3" /> Cancel</> : <><CheckSquare className="h-3 w-3" /> Select</>}
                        </Button>
                      )}
                    </div>
                    {photoSelectMode && (
                      <div className="flex items-center gap-2 mb-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSelectAll}>Select All</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDeselectAll}>Deselect All</Button>
                        <span className="text-xs text-muted-foreground ml-auto">{selectedPhotoIndices.size} selected</span>
                        {selectedPhotoIndices.size > 0 && (
                          <Button size="sm" className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setMoveDialogOpen(true)}>
                            <ArrowRightLeft className="h-3 w-3" /> Move to Album
                          </Button>
                        )}
                      </div>
                    )}
                    <FieldGroup className="p-0 overflow-hidden space-y-0">
                      <PhotoGrid
                        photos={photos}
                        setPhotos={setPhotos}
                        photoListRef={photoListRef}
                        photoDragIdx={photoDragIdx}
                        photoOverIdx={photoOverIdx}
                        onDragStart={handlePhotoDragStart}
                        onDragOver={handlePhotoDragOver}
                        onDrop={handlePhotoDrop}
                        onDragEnd={handlePhotoDragEnd}
                        onTouchMove={handlePhotoTouchMove}
                        onTouchEnd={handlePhotoTouchEnd}
                        onGripTouchStart={handlePhotoGripTouchStart}
                        uploadingPhotos={uploadingPhotos}
                        uploadProgress={uploadProgress}
                        isDraggingOver={isDraggingOver}
                        onFileDrop={handleFileDrop}
                        selectMode={photoSelectMode}
                        selectedIndices={selectedPhotoIndices}
                        onToggleSelect={togglePhotoSelect}
                      />
                    </FieldGroup>
                  </div>
                  <ChildrenList
                    parentId={node.id}
                    children={allNodes.filter((n) => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                    label="Children"
                    onSelectNode={onSelectNode}
                    onAddNode={onAddNode}
                  />
                </>
              )}

              {/* ── VIDEO ── */}
              {node.type === "video" && (
                <>
                  <div>
                    <SectionHeader>Video</SectionHeader>
                    <FieldGroup>
                      {videoUrl && (
                        <div className="rounded-lg overflow-hidden border border-border bg-black">
                          <video controls src={videoUrl} className="w-full max-h-64" />
                        </div>
                      )}
                      <Field label="Video URL">
                        <Input data-testid="input-video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
                      </Field>
                      {uploadingVideo ? (
                        <UploadProgressBar progress={uploadProgress} label="Uploading video…" />
                      ) : (
                        <label className="cursor-pointer block">
                          <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
                          <Button variant="outline" size="sm" asChild className="gap-2"><span data-testid="button-upload-video"><Upload className="h-3.5 w-3.5" />Upload Video File</span></Button>
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground/60">MP4, MOV, WebM, M4V</p>
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

        {/* Move photos dialog — rendered inside ScrollArea's tree but uses a portal */}
        <MovePhotosDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          allNodes={allNodes}
          currentNodeId={node.id}
          selectedCount={selectedPhotoIndices.size}
          onMove={handleMovePhotos}
          moving={movingPhotos}
        />
      </ScrollArea>

      {/* Action bar */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <Button
          size="default"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || isReadOnly}
          data-testid="button-save"
          className={cn(
            "gap-2 px-6 border-0 shadow-sm transition-all duration-300",
            saveFlash
              ? "bg-emerald-500 hover:bg-emerald-500"
              : cn("bg-gradient-to-r hover:shadow-md", gradient, "from-opacity-90")
          )}
        >
          {saveFlash ? (
            <><Check className="h-4 w-4" /> Saved</>
          ) : updateMutation.isPending ? (
            <>Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
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

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

function CoverArtPicker({
  mode, onModeChange,
  imageUrl, onImageChange, onImageUpload,
  imagePosition, onImagePositionChange,
  imageZoom, onImageZoomChange,
  emoji, onEmojiChange,
  color, onColorChange,
  editing, onEditChange,
}: {
  mode: "image" | "emoji"; onModeChange: (m: "image" | "emoji") => void;
  imageUrl: string; onImageChange: (u: string) => void; onImageUpload: (f: File) => Promise<void>;
  imagePosition: string; onImagePositionChange: (p: string) => void;
  imageZoom: number; onImageZoomChange: (z: number) => void;
  emoji: string; onEmojiChange: (e: string) => void;
  color: string; onColorChange: (c: string) => void;
  editing: boolean; onEditChange: (editing: boolean) => void;
}) {
  // Has any cover art been set?
  const hasCover = mode === "image" ? !!imageUrl : !!emoji;

  // Static preview mode: show cover art with Edit button
  if (!editing && hasCover) {
    return (
      <div className="space-y-2">
        {mode === "image" ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted w-full max-w-xs aspect-square">
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                objectFit: "cover",
                objectPosition: imagePosition,
                transform: imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
                transformOrigin: imagePosition,
              }}
            />
          </div>
        ) : (
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shadow-sm border border-border/50"
            style={{ backgroundColor: color }}
          >
            {emoji}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => onEditChange(true)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit Cover
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Done button when editing existing cover */}
      {editing && hasCover && (
        <Button variant="outline" size="sm" onClick={() => onEditChange(false)} className="gap-1.5">
          <Check className="h-3.5 w-3.5" /> Done
        </Button>
      )}

      {/* Tab toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium w-fit">
        <button
          type="button"
          onClick={() => onModeChange("image")}
          className={`px-3 py-1.5 transition-colors ${mode === "image" ? "bg-indigo-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => onModeChange("emoji")}
          className={`px-3 py-1.5 transition-colors ${mode === "emoji" ? "bg-indigo-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          Emoji
        </button>
      </div>

      {mode === "image" ? (
        <ImageUploader
          value={imageUrl}
          onChange={onImageChange}
          onUpload={onImageUpload}
          position={imagePosition}
          onPositionChange={onImagePositionChange}
          zoom={imageZoom}
          onZoomChange={onImageZoomChange}
        />
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shadow-sm border border-border/50"
            style={{ backgroundColor: color }}
          >
            {emoji || "🎵"}
          </div>
          {/* Emoji input */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
            <Input
              value={emoji}
              onChange={(e) => {
                const val = [...e.target.value][0] ?? "";
                onEmojiChange(val);
              }}
              placeholder="🎵"
              className="w-24 text-2xl text-center"
            />
          </div>
          {/* Color swatches */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Background color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color */}
              <label className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-indigo-400 overflow-hidden" title="Custom color">
                <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                <span className="text-[10px] text-muted-foreground">+</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageUploader({
  value, onChange, onUpload,
  position = "50% 50%", onPositionChange,
  zoom = 1, onZoomChange,
}: {
  value: string; onChange: (url: string) => void; onUpload: (file: File) => Promise<void>;
  position?: string; onPositionChange?: (p: string) => void;
  zoom?: number; onZoomChange?: (z: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const dragRef = useRef<{ startX: number; startY: number; startPos: [number, number] } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Parse "X% Y%" into [x, y] numbers
  const parsePos = (p: string): [number, number] => {
    const parts = p.replace(/%/g, "").split(" ").map(Number);
    return [parts[0] ?? 50, parts[1] ?? 50];
  };

  const startDrag = (clientX: number, clientY: number) => {
    const [px, py] = parsePos(position);
    dragRef.current = { startX: clientX, startY: clientY, startPos: [px, py] };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const dx = (dragRef.current.startX - clientX) / 2;
    const dy = (dragRef.current.startY - clientY) / 2;
    const nx = Math.min(100, Math.max(0, dragRef.current.startPos[0] + dx));
    const ny = Math.min(100, Math.max(0, dragRef.current.startPos[1] + dy));
    onPositionChange?.(`${Math.round(nx)}% ${Math.round(ny)}%`);
  };

  const endDrag = () => { dragRef.current = null; };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    const onMove = (me: MouseEvent) => moveDrag(me.clientX, me.clientY);
    const onUp = () => {
      endDrag();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Pinch-to-zoom helpers
  const getTouchDist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  // Touch events — 1 finger = reposition, 2 fingers = pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && onZoomChange) {
      // Start pinch
      e.preventDefault();
      dragRef.current = null; // cancel any drag
      pinchRef.current = {
        startDist: getTouchDist(e.touches[0], e.touches[1]),
        startZoom: zoom,
      };
    } else if (e.touches.length === 1 && !pinchRef.current) {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current && onZoomChange) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const scale = newDist / pinchRef.current.startDist;
      const newZoom = Math.min(3, Math.max(1, pinchRef.current.startZoom * scale));
      onZoomChange(Math.round(newZoom * 20) / 20); // snap to 0.05 increments
    } else if (e.touches.length === 1 && dragRef.current) {
      e.preventDefault();
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }
  };
  const handleTouchEnd = () => {
    pinchRef.current = null;
    endDrag();
  };

  return (
    <div className="space-y-3">
      {value ? (
        <>
          {/* Preview — drag to reposition if supported */}
          <div className="space-y-1">
            {onPositionChange && <p className="text-xs text-muted-foreground">Drag to reposition{onZoomChange ? " · Pinch to zoom" : ""}</p>}
            <div
              className={`relative rounded-xl overflow-hidden border border-border bg-muted w-full max-w-xs aspect-square select-none touch-none ${onPositionChange ? "cursor-grab active:cursor-grabbing" : ""}`}
              onMouseDown={onPositionChange ? handleMouseDown : undefined}
              onTouchStart={(onPositionChange || onZoomChange) ? handleTouchStart : undefined}
              onTouchMove={(onPositionChange || onZoomChange) ? handleTouchMove : undefined}
              onTouchEnd={(onPositionChange || onZoomChange) ? handleTouchEnd : undefined}
            >
              <img
                src={value}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: "cover",
                  objectPosition: position,
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  transformOrigin: position,
                }}
              />
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 shadow-lg text-xs"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => { onChange(""); onPositionChange?.("50% 50%"); onZoomChange?.(1); }}
                >
                  <X className="h-3 w-3" />Remove
                </Button>
              </div>
            </div>
          </div>

          {/* Zoom slider — only when repositioning is supported */}
          {onZoomChange && (
            <div className="space-y-1 max-w-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Zoom</p>
                <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          )}

          {/* Replace image */}
          <label className="cursor-pointer inline-block">
            <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try { await onUpload(f); onPositionChange?.("50% 50%"); onZoomChange?.(1); }
              catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
              finally { setUploading(false); }
            }} />
            <span className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors">
              {uploading ? "Uploading…" : "Replace image"}
            </span>
          </label>
        </>
      ) : (
        <label className={uploading ? "cursor-wait block" : "cursor-pointer block"}>
          <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            try { await onUpload(f); } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
            finally { setUploading(false); }
          }} />
          <div className="w-full rounded-xl border-2 border-dashed border-border/70 bg-muted/20 flex flex-col items-center gap-2.5 py-10 hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{uploading ? "Uploading…" : "Click to upload"}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG, GIF, WebP</p>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}

function UploadProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label || "Uploading…"}</span>
        <span className="text-muted-foreground tabular-nums">{progress}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
