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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Music, Disc3, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
}

interface ITunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  trackCount: number;
}

type ITunesResult = ITunesTrack | ITunesAlbum;

function isTrack(r: ITunesResult): r is ITunesTrack {
  return "trackId" in r;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getHighResArt(url: string): string {
  return url.replace("100x100", "600x600");
}

export function ITunesSearchDialog({
  open,
  onOpenChange,
  parentId,
  existingChildCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  existingChildCount: number;
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"song" | "album">("song");
  const [results, setResults] = useState<ITunesResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [expandedAlbums, setExpandedAlbums] = useState<Map<number, ITunesTrack[]>>(new Map());
  const [loadingAlbums, setLoadingAlbums] = useState<Set<number>>(new Set());

  // Track data for selected tracks (needed for creating nodes)
  const [trackDataMap, setTrackDataMap] = useState<Map<number, ITunesTrack>>(new Map());

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setResults([]);
    setSelectedTrackIds(new Set());
    setExpandedAlbums(new Map());
    setTrackDataMap(new Map());

    try {
      const entity = searchMode === "song" ? "song" : "album";
      const res = await apiRequest("GET", `/api/itunes/search?term=${encodeURIComponent(searchTerm)}&entity=${entity}&limit=25`);
      const data = await res.json();
      setResults(data.results || []);

      // Pre-populate trackDataMap for song results
      if (searchMode === "song") {
        const map = new Map<number, ITunesTrack>();
        for (const r of data.results || []) {
          if (isTrack(r)) map.set(r.trackId, r);
        }
        setTrackDataMap(map);
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchMode, toast]);

  const toggleAlbum = useCallback(async (album: ITunesAlbum) => {
    if (expandedAlbums.has(album.collectionId)) {
      setExpandedAlbums((prev) => {
        const next = new Map(prev);
        next.delete(album.collectionId);
        return next;
      });
      return;
    }

    setLoadingAlbums((prev) => new Set(prev).add(album.collectionId));
    try {
      const res = await apiRequest("GET", `/api/itunes/lookup?id=${album.collectionId}`);
      const data = await res.json();
      const tracks: ITunesTrack[] = (data.results || []).filter(
        (r: any) => r.wrapperType === "track"
      );
      setExpandedAlbums((prev) => new Map(prev).set(album.collectionId, tracks));

      // Add tracks to data map
      setTrackDataMap((prev) => {
        const next = new Map(prev);
        for (const t of tracks) next.set(t.trackId, t);
        return next;
      });
    } catch (err: any) {
      toast({ title: "Failed to load album tracks", description: err.message, variant: "destructive" });
    } finally {
      setLoadingAlbums((prev) => {
        const next = new Set(prev);
        next.delete(album.collectionId);
        return next;
      });
    }
  }, [expandedAlbums, toast]);

  const toggleTrack = useCallback((trackId: number) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const selectAllAlbumTracks = useCallback((albumId: number) => {
    const tracks = expandedAlbums.get(albumId);
    if (!tracks) return;
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      const allSelected = tracks.every((t) => next.has(t.trackId));
      if (allSelected) {
        for (const t of tracks) next.delete(t.trackId);
      } else {
        for (const t of tracks) next.add(t.trackId);
      }
      return next;
    });
  }, [expandedAlbums]);

  const handleAddSelected = useCallback(async () => {
    if (selectedTrackIds.size === 0) return;
    setAdding(true);
    let sortOrder = existingChildCount;

    try {
      const trackIds = Array.from(selectedTrackIds);
      for (const trackId of trackIds) {
        const track = trackDataMap.get(trackId);
        if (!track) continue;

        await apiRequest("POST", "/api/nodes", {
          parentId,
          type: "song",
          title: track.trackName,
          sortOrder: sortOrder++,
          status: "published",
          metadata: {
            audioUrl: track.previewUrl || null,
            coverImageUrl: getHighResArt(track.artworkUrl100) || null,
            artistName: track.artistName || null,
            albumName: track.collectionName || null,
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
      toast({
        title: "Songs added",
        description: `Added ${trackIds.length} song${trackIds.length !== 1 ? "s" : ""} from iTunes.`,
      });
      onOpenChange(false);
      setSearchTerm("");
      setResults([]);
      setSelectedTrackIds(new Set());
      setExpandedAlbums(new Map());
      setTrackDataMap(new Map());
    } catch (err: any) {
      toast({ title: "Failed to add songs", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }, [selectedTrackIds, trackDataMap, parentId, existingChildCount, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Add from iTunes
          </DialogTitle>
          <DialogDescription>
            Search the iTunes catalog and add songs to this folder.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search songs or albums..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching || !searchTerm.trim()} className="gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={searchMode} onValueChange={(v) => {
          setSearchMode(v as "song" | "album");
          setResults([]);
          setSelectedTrackIds(new Set());
          setExpandedAlbums(new Map());
          setTrackDataMap(new Map());
        }}>
          <TabsList className="w-full">
            <TabsTrigger value="song" className="flex-1 gap-1.5">
              <Music className="h-3.5 w-3.5" /> Songs
            </TabsTrigger>
            <TabsTrigger value="album" className="flex-1 gap-1.5">
              <Disc3 className="h-3.5 w-3.5" /> Albums
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-0.5 py-1">
            {searching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-[60px] h-[60px] rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : results.length === 0 && searchTerm ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {searchTerm && !searching ? "No results found. Try a different search." : "Search for songs or albums above."}
              </div>
            ) : (
              results.map((result) => {
                if (searchMode === "song" && isTrack(result)) {
                  return (
                    <TrackRow
                      key={result.trackId}
                      track={result}
                      selected={selectedTrackIds.has(result.trackId)}
                      onToggle={() => toggleTrack(result.trackId)}
                    />
                  );
                }

                if (searchMode === "album" && !isTrack(result)) {
                  const album = result as ITunesAlbum;
                  const isExpanded = expandedAlbums.has(album.collectionId);
                  const isLoading = loadingAlbums.has(album.collectionId);
                  const albumTracks = expandedAlbums.get(album.collectionId);

                  return (
                    <div key={album.collectionId}>
                      <button
                        onClick={() => toggleAlbum(album)}
                        className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <img
                          src={album.artworkUrl100}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border/50"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{album.collectionName}</p>
                          <p className="text-xs text-muted-foreground truncate">{album.artistName}</p>
                          <p className="text-xs text-muted-foreground/60">{album.trackCount} tracks</p>
                        </div>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && albumTracks && (
                        <div className="ml-4 border-l-2 border-border pl-2 mb-2">
                          <button
                            onClick={() => selectAllAlbumTracks(album.collectionId)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 transition-colors"
                          >
                            {albumTracks.every((t) => selectedTrackIds.has(t.trackId))
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                          {albumTracks.map((track) => (
                            <TrackRow
                              key={track.trackId}
                              track={track}
                              selected={selectedTrackIds.has(track.trackId)}
                              onToggle={() => toggleTrack(track.trackId)}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {selectedTrackIds.size > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {selectedTrackIds.size} song{selectedTrackIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button onClick={handleAddSelected} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
              Add Selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TrackRow({
  track,
  selected,
  onToggle,
  compact,
}: {
  track: ITunesTrack;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-lg transition-colors cursor-pointer",
        compact ? "p-1.5" : "p-2",
        selected ? "bg-indigo-50" : "hover:bg-muted/50",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />
      <img
        src={track.artworkUrl100}
        alt=""
        className={cn(
          "rounded-md object-cover flex-shrink-0 border border-border/50",
          compact ? "w-10 h-10" : "w-[60px] h-[60px]",
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{track.trackName}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
        {!compact && <p className="text-xs text-muted-foreground/60 truncate">{track.collectionName}</p>}
      </div>
      {track.trackTimeMillis > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
          {formatDuration(track.trackTimeMillis)}
        </span>
      )}
    </label>
  );
}
