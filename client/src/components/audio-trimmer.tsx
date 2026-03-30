import { useState, useRef, useEffect, useCallback } from "react";
import { Scissors, Play, Pause, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

/**
 * Visual audio trimmer with waveform, draggable handles, preview, and export.
 *
 * onTrimComplete is called with the trimmed audio Blob + its duration.
 */
export function AudioTrimmer({
  audioUrl,
  onTrimComplete,
  onCancel,
}: {
  audioUrl: string;
  onTrimComplete: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [startPct, setStartPct] = useState(0);   // 0–1
  const [endPct, setEndPct] = useState(1);         // 0–1
  const [playing, setPlaying] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(0); // seconds
  const [trimming, setTrimming] = useState(false);
  const animRef = useRef<number>(0);
  const playStartRef = useRef<{ wallTime: number; audioTime: number }>({ wallTime: 0, audioTime: 0 });

  // Decode audio
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const res = await fetch(audioUrl);
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;
        bufferRef.current = decoded;
        setDuration(decoded.duration);
        setLoading(false);
        drawWaveform(decoded);
      } catch (err) {
        console.error("Audio decode error:", err);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [audioUrl]);

  // Redraw waveform when handles change
  useEffect(() => {
    if (bufferRef.current && !loading) drawWaveform(bufferRef.current);
  }, [startPct, endPct, loading]);

  const drawWaveform = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));

    ctx.clearRect(0, 0, w, h);

    // Draw bars
    const mid = h / 2;
    for (let x = 0; x < w; x++) {
      const i = Math.floor(x * (data.length / w));
      let max = 0;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[i + j] || 0);
        if (v > max) max = v;
      }
      const barH = max * mid * 0.9;
      const pct = x / w;
      const inRegion = pct >= startPct && pct <= endPct;

      ctx.fillStyle = inRegion ? "#10b981" : "#d1d5db";
      // Top half
      ctx.fillRect(x, mid - barH, 1, barH);
      // Bottom half
      ctx.fillRect(x, mid, 1, barH);
    }

    // Dimmed overlay outside region
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(0, 0, startPct * w, h);
    ctx.fillRect(endPct * w, 0, (1 - endPct) * w, h);
  }, [startPct, endPct]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bufferRef.current) return;
    const ro = new ResizeObserver(() => {
      if (bufferRef.current) drawWaveform(bufferRef.current);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawWaveform, loading]);

  // --- Handle dragging ---
  const dragging = useRef<"start" | "end" | "region" | null>(null);
  const dragOrigin = useRef<{ pct: number; startPct: number; endPct: number }>({
    pct: 0, startPct: 0, endPct: 1,
  });

  const pctFromEvent = (clientX: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pct = pctFromEvent(e.clientX);
    const startDist = Math.abs(pct - startPct);
    const endDist = Math.abs(pct - endPct);
    const HANDLE_THRESHOLD = 0.04; // ~4% of width

    if (startDist < HANDLE_THRESHOLD && startDist <= endDist) {
      dragging.current = "start";
    } else if (endDist < HANDLE_THRESHOLD) {
      dragging.current = "end";
    } else if (pct > startPct && pct < endPct) {
      dragging.current = "region";
      dragOrigin.current = { pct, startPct, endPct };
    } else {
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const pct = pctFromEvent(e.clientX);
    const MIN_SPAN = 0.02; // minimum ~2% selection

    if (dragging.current === "start") {
      setStartPct(Math.min(pct, endPct - MIN_SPAN));
    } else if (dragging.current === "end") {
      setEndPct(Math.max(pct, startPct + MIN_SPAN));
    } else if (dragging.current === "region") {
      const delta = pct - dragOrigin.current.pct;
      let newStart = dragOrigin.current.startPct + delta;
      let newEnd = dragOrigin.current.endPct + delta;
      if (newStart < 0) { newEnd -= newStart; newStart = 0; }
      if (newEnd > 1) { newStart -= (newEnd - 1); newEnd = 1; }
      setStartPct(Math.max(0, newStart));
      setEndPct(Math.min(1, newEnd));
    }
  };

  const handlePointerUp = () => {
    dragging.current = null;
  };

  // --- Playback ---
  const stopPlayback = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaying(false);
  };

  const playSelection = () => {
    if (!bufferRef.current || !audioCtxRef.current) return;
    stopPlayback();

    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(ctx.destination);

    const start = startPct * duration;
    const end = endPct * duration;
    const selDuration = end - start;

    source.start(0, start, selDuration);
    sourceRef.current = source;
    setPlaying(true);
    playStartRef.current = { wallTime: ctx.currentTime, audioTime: start };

    source.onended = () => {
      setPlaying(false);
      setPlaybackPos(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };

    const animate = () => {
      const elapsed = ctx.currentTime - playStartRef.current.wallTime;
      setPlaybackPos(playStartRef.current.audioTime + elapsed);
      if (elapsed < selDuration) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const togglePlayback = () => {
    if (playing) stopPlayback();
    else playSelection();
  };

  // --- Trim & export ---
  const handleTrim = async () => {
    if (!bufferRef.current || !audioCtxRef.current) return;
    setTrimming(true);
    stopPlayback();

    try {
      const buf = bufferRef.current;
      const sr = buf.sampleRate;
      const startSample = Math.floor(startPct * buf.length);
      const endSample = Math.floor(endPct * buf.length);
      const len = endSample - startSample;

      // Create offline context and copy selected region
      const offCtx = new OfflineAudioContext(buf.numberOfChannels, len, sr);
      const newBuf = offCtx.createBuffer(buf.numberOfChannels, len, sr);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch);
        const dst = newBuf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          dst[i] = src[startSample + i];
        }
      }

      const source = offCtx.createBufferSource();
      source.buffer = newBuf;
      source.connect(offCtx.destination);
      source.start();

      const rendered = await offCtx.startRendering();

      // Encode as WAV (universally supported)
      const wavBlob = audioBufferToWav(rendered);
      const trimmedDuration = len / sr;

      onTrimComplete(wavBlob, trimmedDuration);
    } catch (err) {
      console.error("Trim failed:", err);
    } finally {
      setTrimming(false);
    }
  };

  const resetHandles = () => {
    stopPlayback();
    setStartPct(0);
    setEndPct(1);
  };

  const startTime = startPct * duration;
  const endTime = endPct * duration;
  const selDuration = endTime - startTime;

  // Playback indicator position as fraction
  const playPct = playing && duration > 0 ? playbackPos / duration : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-foreground">Trim Audio</span>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="h-20 rounded-xl bg-muted/50 animate-pulse flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Loading waveform…</p>
        </div>
      ) : (
        <>
          {/* Waveform + handles */}
          <div
            ref={containerRef}
            className="relative h-20 rounded-xl bg-muted/30 border border-border overflow-hidden cursor-col-resize select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas ref={canvasRef} className="w-full h-full" />

            {/* Start handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-emerald-600 cursor-ew-resize"
              style={{ left: `${startPct * 100}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-emerald-600 rounded-b-md flex items-center justify-center">
                <div className="w-0.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* End handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-emerald-600 cursor-ew-resize"
              style={{ left: `${endPct * 100}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-emerald-600 rounded-b-md flex items-center justify-center">
                <div className="w-0.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Playback cursor */}
            {playing && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 pointer-events-none transition-[left] duration-75"
                style={{ left: `${playPct * 100}%` }}
              />
            )}
          </div>

          {/* Time labels */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>{fmtTime(startTime)}</span>
            <span className="text-emerald-600 font-semibold">
              Selection: {fmtTime(selDuration)}
            </span>
            <span>{fmtTime(endTime)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              className="gap-1.5"
            >
              {playing ? (
                <><Pause className="h-3.5 w-3.5" /> Pause</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Preview</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetHandles}
              className="gap-1.5 text-muted-foreground"
              title="Reset to full length"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTrim}
              disabled={trimming || (startPct === 0 && endPct === 1)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {trimming ? (
                <>Trimming…</>
              ) : (
                <><Check className="h-3.5 w-3.5" /> Save Trim</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Encode an AudioBuffer as a 16-bit PCM WAV Blob */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = len * blockAlign;
  const headerSize = 44;
  const arrayBuf = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuf);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channel data
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuf], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
