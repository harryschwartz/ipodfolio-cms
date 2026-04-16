import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Music,
  ListMusic,
  Plus,
  Search,
  ChevronRight,
  Globe,
  EyeOff,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AudioBadge } from "@/components/audio-badge";
import { ITunesSearchDialog, getHighResArt } from "@/components/itunes-search-dialog";
import type { ITunesTrack } from "@/components/itunes-search-dialog";
import { cn } from "@/lib/utils";
import type { MenuNodeWithMetadata } from "@shared/schema";

export const MUSIC_FOLDER_ID = "00000000-0000-4000-a000-00000000000d";

const HIDDEN_MUSIC_CHILDREN = new Set([
  "00000000-0000-4000-a000-00000000000e", // Cover Flow
  "00000000-0000-4000-a000-00000000000f", // Playlists folder
  "00000000-0000-4000-a000-000000000012", // Artists
  "00000000-0000-4000-a000-000000000013", // Albums
  "00000000-0000-4000-a000-000000000014", // Search
]);

export function isMusicFolder(nodeId: string): boolean {
  return nodeId === MUSIC_FOLDER_ID;
}

export function isHiddenMusicChild(nodeId: string, parentId: string | null | undefined): boolean {
  return parentId === MUSIC_FOLDER_ID && HIDDEN_MUSIC_CHILDREN.has(nodeId);
}

/** The special library-style view for the Music folder */
export function MusicLibraryView({
  node,
  allNodes,
  onSelectNode,
}: {
  node: MenuNodeWithMetadata;
  allNodes: MenuNodeWithMetadata[];
  onSelectNode: (id: string) => void;
}) {
  const { toast } = useToast();
  const [itunesOpen, setItunesOpen] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Library songs: direct children of Music with type 'song'
  const librarySongs = allNodes
    .filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "song")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Playlists: direct children of Music with type 'playlist'
  const playlists = allNodes
    .filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "playlist")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleCreatePlaylist = useCallback(async () => {
    setCreatingPlaylist(true);
    try {
      const maxSort = allNodes
        .filter((n) => n.parentId === MUSIC_FOLDER_ID)
        .reduce((max, n) => Math.max(max, n.sortOrder), -1);

      const res = await apiRequest("POST", "/api/nodes", {
        parentId: MUSIC_FOLDER_ID,
        type: "playlist",
        title: "New Playlist",
        sortOrder: maxSort + 1,
        status: "published",
        metadata: {},
      });
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({ title: "Playlist created", description: "New playlist added to your library." });
      onSelectNode(created.id);
    } catch (err: any) {
      toast({ title: "Failed to create playlist", description: err.message, variant: "destructive" });
    } finally {
      setCreatingPlaylist(false);
    }
  }, [allNodes, onSelectNode, toast]);

  return (
    <div className="space-y-6">
      {/* ── Playlists Section ── */}
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border min-w-0">
          <div className="flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Playlists
              {playlists.length > 0 && (
                <span className="ml-2 text-muted-foreground/40 normal-case font-medium tracking-normal">
                  {playlists.length}
                </span>
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={handleCreatePlaylist}
            disabled={creatingPlaylist}
          >
            {creatingPlaylist ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Create Playlist
          </Button>
        </div>
        <div className="bg-white">
          {playlists.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No playlists yet. Create one to organize your songs.
            </div>
          ) : (
            playlists.map((playlist) => {
              const playlistSongCount = allNodes.filter(
                (n) => n.parentId === playlist.id && n.type === "song"
              ).length;
              return (
                <div
                  key={playlist.id}
                  onClick={() => onSelectNode(playlist.id)}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                    <ListMusic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{playlist.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {playlistSongCount} song{playlistSongCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <PublishBadge node={playlist} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Library Section ── */}
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border min-w-0">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-emerald-600" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Library
              {librarySongs.length > 0 && (
                <span className="ml-2 text-muted-foreground/40 normal-case font-medium tracking-normal">
                  {librarySongs.length}
                </span>
              )}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-shrink-0" onClick={() => setItunesOpen(true)}>
            <Search className="h-3 w-3" />
            Add from iTunes
          </Button>
        </div>
        <div className="bg-white">
          {librarySongs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No songs in library yet. Add songs from iTunes to get started.
            </div>
          ) : (
            librarySongs.map((song) => (
              <SongRow key={song.id} song={song} onSelect={() => onSelectNode(song.id)} />
            ))
          )}
        </div>
      </div>

      <ITunesSearchDialog
        open={itunesOpen}
        onOpenChange={setItunesOpen}
        parentId={MUSIC_FOLDER_ID}
        existingChildCount={librarySongs.length}
      />
    </div>
  );
}

/** Playlist editor view: shows playlist songs + "Add from Library" + "Add from iTunes" */
export function PlaylistEditorView({
  node,
  allNodes,
  onSelectNode,
}: {
  node: MenuNodeWithMetadata;
  allNodes: MenuNodeWithMetadata[];
  onSelectNode: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itunesOpen, setItunesOpen] = useState(false);

  // Songs in this playlist
  const playlistSongs = allNodes
    .filter((n) => n.parentId === node.id && n.type === "song")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Library songs count (for sort order when adding to library)
  const librarySongs = allNodes
    .filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "song");

  // Check if this playlist is under the Music folder
  const isUnderMusic = node.parentId === MUSIC_FOLDER_ID;

  // Add iTunes tracks to both library and playlist
  const handleAddFromItunes = useCallback(async (tracks: ITunesTrack[]) => {
    let librarySortOrder = librarySongs.length;
    let playlistSortOrder = playlistSongs.length;

    for (const track of tracks) {
      // 1. Create song in the library
      const libRes = await apiRequest("POST", "/api/nodes", {
        parentId: MUSIC_FOLDER_ID,
        type: "song",
        title: track.trackName,
        sortOrder: librarySortOrder++,
        status: "published",
        metadata: {
          audioUrl: track.previewUrl || null,
          coverImageUrl: getHighResArt(track.artworkUrl100) || null,
          artistName: track.artistName || null,
          albumName: track.collectionName || null,
          trackNumber: track.trackNumber || null,
        },
      });
      const librarySong = await libRes.json();

      // 2. Create playlist reference pointing to the library song
      await apiRequest("POST", "/api/nodes", {
        parentId: node.id,
        type: "song",
        title: track.trackName,
        sortOrder: playlistSortOrder++,
        status: "published",
        metadata: {
          audioUrl: track.previewUrl || null,
          coverImageUrl: getHighResArt(track.artworkUrl100) || null,
          artistName: track.artistName || null,
          albumName: track.collectionName || null,
          trackNumber: track.trackNumber || null,
          sourceNodeId: librarySong.id,
        },
      });
    }
  }, [librarySongs.length, playlistSongs.length, node.id]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 flex-shrink-0">
          Songs
          {playlistSongs.length > 0 && (
            <span className="ml-2 text-muted-foreground/40 normal-case font-medium tracking-normal">
              {playlistSongs.length}
            </span>
          )}
        </p>
        {isUnderMusic && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setItunesOpen(true)}>
              <Search className="h-3 w-3" />
              Add from iTunes
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPickerOpen(true)}>
              <Plus className="h-3 w-3" />
              Add from Library
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        {playlistSongs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No songs in this playlist yet.{isUnderMusic ? " Add songs from your library." : ""}
          </div>
        ) : (
          playlistSongs.map((song) => (
            <SongRow key={song.id} song={song} onSelect={() => onSelectNode(song.id)} />
          ))
        )}
      </div>

      {isUnderMusic && (
        <>
          <LibrarySongPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            allNodes={allNodes}
            playlistId={node.id}
            existingPlaylistSongs={playlistSongs}
          />
          <ITunesSearchDialog
            open={itunesOpen}
            onOpenChange={setItunesOpen}
            parentId={MUSIC_FOLDER_ID}
            existingChildCount={librarySongs.length}
            onAddTracks={handleAddFromItunes}
          />
        </>
      )}
    </div>
  );
}

/** A compact song row used in both library and playlist views */
function SongRow({ song, onSelect }: { song: MenuNodeWithMetadata; onSelect: () => void }) {
  const meta = song.metadata as any;
  const coverUrl = meta?.coverImageUrl;

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border/50" />
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600">
          <Music className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[meta?.artistName, meta?.albumName].filter(Boolean).join(" — ")}
        </p>
      </div>
      {meta?.audioUrl && (
        <AudioBadge audioUrl={meta.audioUrl} duration={meta?.duration} />
      )}
      <PublishBadge node={song} />
    </div>
  );
}

/** Inline publish status badge */
function PublishBadge({ node }: { node: MenuNodeWithMetadata }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const endpoint = node.status === "published" ? "unpublish" : "publish";
        apiRequest("POST", `/api/nodes/${node.id}/${endpoint}`).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
        });
      }}
      className={cn(
        "flex items-center gap-1 px-1.5 py-1 rounded-full text-[10px] font-semibold transition-all flex-shrink-0",
        node.status === "published"
          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
          : "text-muted-foreground bg-muted/50 hover:bg-muted"
      )}
      title={node.status === "published" ? "Published — tap to unpublish" : "Draft — tap to publish"}
    >
      {node.status === "published" ? (
        <Globe className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
    </button>
  );
}

/** Dialog to pick library songs and add them to a playlist */
function LibrarySongPicker({
  open,
  onOpenChange,
  allNodes,
  playlistId,
  existingPlaylistSongs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allNodes: MenuNodeWithMetadata[];
  playlistId: string;
  existingPlaylistSongs: MenuNodeWithMetadata[];
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");

  // All library songs (direct children of Music folder with type 'song')
  const librarySongs = allNodes
    .filter((n) => n.parentId === MUSIC_FOLDER_ID && n.type === "song")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Already-added source IDs (to show which are already in the playlist)
  const existingSourceIds = new Set(
    existingPlaylistSongs
      .map((n) => (n.metadata as any)?.sourceNodeId)
      .filter(Boolean)
  );

  // Filtered songs
  const filtered = filter.trim()
    ? librarySongs.filter((s) => {
        const meta = s.metadata as any;
        const searchable = [s.title, meta?.artistName, meta?.albumName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(filter.toLowerCase());
      })
    : librarySongs;

  const toggleSong = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      let sortOrder = existingPlaylistSongs.length;

      for (const songId of Array.from(selectedIds)) {
        const sourceSong = allNodes.find((n) => n.id === songId);
        if (!sourceSong) continue;
        const meta = sourceSong.metadata as any;

        await apiRequest("POST", "/api/nodes", {
          parentId: playlistId,
          type: "song",
          title: sourceSong.title,
          sortOrder: sortOrder++,
          status: "published",
          metadata: {
            audioUrl: meta?.audioUrl || null,
            coverImageUrl: meta?.coverImageUrl || null,
            artistName: meta?.artistName || null,
            albumName: meta?.albumName || null,
            trackNumber: meta?.trackNumber || null,
            sourceNodeId: songId,
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({
        title: "Songs added to playlist",
        description: `Added ${selectedIds.size} song${selectedIds.size !== 1 ? "s" : ""}.`,
      });
      onOpenChange(false);
      setSelectedIds(new Set());
      setFilter("");
    } catch (err: any) {
      toast({ title: "Failed to add songs", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }, [selectedIds, allNodes, playlistId, existingPlaylistSongs.length, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedIds(new Set()); setFilter(""); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Add from Library
          </DialogTitle>
          <DialogDescription>
            Select songs from your music library to add to this playlist.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter songs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-0.5 py-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {librarySongs.length === 0
                  ? "No songs in your library yet."
                  : "No songs match your filter."}
              </div>
            ) : (
              filtered.map((song) => {
                const meta = song.metadata as any;
                const coverUrl = meta?.coverImageUrl;
                const isAlreadyAdded = existingSourceIds.has(song.id);
                const isSelected = selectedIds.has(song.id);

                return (
                  <label
                    key={song.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                      isSelected ? "bg-indigo-50" : "hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSong(song.id)}
                      className="flex-shrink-0"
                    />
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-border/50" />
                    ) : (
                      <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600">
                        <Music className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[meta?.artistName, meta?.albumName].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    {isAlreadyAdded && (
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                        Added
                      </Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} song{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button onClick={handleAdd} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to Playlist
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
