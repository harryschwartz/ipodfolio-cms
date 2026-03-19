import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "recorded" | "playing";

export function AudioRecorder({
  onRecordingComplete,
}: {
  onRecordingComplete: (blob: Blob) => void;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "hsl(235, 22%, 10%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(239, 84%, 67%)";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);
      drawWaveform();

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      // Microphone not available
    }
  }, [drawWaveform]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const playRecording = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setState("recorded");
    audio.play();
    setState("playing");
  }, [recordedBlob]);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setState("recorded");
  }, []);

  const reRecord = useCallback(() => {
    setRecordedBlob(null);
    setState("idle");
    setRecordingTime(0);
  }, []);

  const saveRecording = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
      reRecord();
    }
  }, [recordedBlob, onRecordingComplete, reRecord]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-3"
      data-testid="audio-recorder"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mic className="h-3.5 w-3.5" />
        <span>Voice Recorder</span>
      </div>

      {/* Waveform */}
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        className="w-full h-[60px] rounded bg-card border border-border"
      />

      {/* Timer */}
      {(state === "recording" || state === "recorded" || state === "playing") && (
        <div className="text-center text-xs font-mono text-muted-foreground">
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {state === "idle" && (
          <Button
            size="default"
            variant="default"
            onClick={startRecording}
            data-testid="button-start-recording"
            className="gap-1.5 h-10 md:h-8 px-4 md:px-3"
          >
            <Mic className="h-4 w-4 md:h-3.5 md:w-3.5" />
            Record
          </Button>
        )}

        {state === "recording" && (
          <Button
            size="default"
            variant="destructive"
            onClick={stopRecording}
            data-testid="button-stop-recording"
            className="gap-1.5 h-10 md:h-8 px-4 md:px-3"
          >
            <Square className="h-4 w-4 md:h-3 md:w-3" />
            Stop
          </Button>
        )}

        {state === "recorded" && (
          <>
            <Button
              size="default"
              variant="secondary"
              onClick={playRecording}
              data-testid="button-play-recording"
              className="gap-1.5 h-10 md:h-8 px-4 md:px-3"
            >
              <Play className="h-4 w-4 md:h-3 md:w-3" />
              Play
            </Button>
            <Button
              size="default"
              variant="secondary"
              onClick={reRecord}
              data-testid="button-re-record"
              className="gap-1.5 h-10 md:h-8 px-4 md:px-3"
            >
              <RotateCcw className="h-4 w-4 md:h-3 md:w-3" />
              Re-record
            </Button>
            <Button
              size="default"
              variant="default"
              onClick={saveRecording}
              data-testid="button-save-recording"
              className="h-10 md:h-8 px-4 md:px-3"
            >
              Save
            </Button>
          </>
        )}

        {state === "playing" && (
          <Button
            size="default"
            variant="secondary"
            onClick={stopPlayback}
            data-testid="button-stop-playback"
            className="gap-1.5 h-10 md:h-8 px-4 md:px-3"
          >
            <Pause className="h-4 w-4 md:h-3 md:w-3" />
            Pause
          </Button>
        )}
      </div>
    </div>
  );
}
