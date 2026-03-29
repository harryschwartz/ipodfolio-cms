import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";

/** Format seconds as m:ss */
function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Compact inline badge that shows a song has a recording.
 * Displays a waveform icon, duration, and a play/pause toggle.
 * Designed to fit inside tree rows and children lists.
 */
export function AudioBadge({
  audioUrl,
  duration,
  className,
}: {
  audioUrl: string;
  duration?: number | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [resolvedDuration, setResolvedDuration] = useState<number | null>(
    duration ?? null
  );
  const [currentTime, setCurrentTime] = useState(0);

  // Create audio element lazily on first play
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", () => {
        if (a.duration && isFinite(a.duration)) {
          setResolvedDuration(a.duration);
        }
      });
      a.addEventListener("timeupdate", () => {
        setCurrentTime(a.currentTime);
      });
      a.addEventListener("ended", () => {
        setPlaying(false);
        setCurrentTime(0);
      });
      audioRef.current = a;
    }
    return audioRef.current;
  }, [audioUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't navigate to editor
    const a = getAudio();
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  };

  const displayTime = playing
    ? fmtDuration(currentTime)
    : resolvedDuration
      ? fmtDuration(resolvedDuration)
      : null;

  // Progress as fraction 0–1
  const progress =
    playing && resolvedDuration ? currentTime / resolvedDuration : 0;

  return (
    <button
      onClick={togglePlay}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all flex-shrink-0",
        playing
          ? "bg-emerald-100 text-emerald-700"
          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
        className
      )}
      title={playing ? "Pause preview" : "Play preview"}
    >
      {playing ? (
        <Pause className="h-2.5 w-2.5 fill-current" />
      ) : (
        <Play className="h-2.5 w-2.5 fill-current" />
      )}
      {playing && resolvedDuration ? (
        <span className="relative w-8 h-1 rounded-full bg-emerald-200 overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      ) : (
        <AudioLines className="h-2.5 w-2.5" />
      )}
      {displayTime && <span>{displayTime}</span>}
    </button>
  );
}
