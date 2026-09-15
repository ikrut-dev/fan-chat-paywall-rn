export interface FrameReport {
  totalFrames: number;
  durationMs: number;
  avgFrameMs: number;
  droppedFrames: number;
  p95FrameMs: number;
  jsFps: number;
}

const TARGET_FRAME_MS = 1000 / 60;
const DROPPED_FRAME_THRESHOLD_MS = TARGET_FRAME_MS * 1.5;

export class FrameMonitor {
  private frameTimes: number[] = [];
  private running = false;
  private lastTimestamp = 0;
  private rafHandle: number | null = null;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.frameTimes = [];
    this.lastTimestamp = 0;
    const tick = (timestamp: number) => {
      if (!this.running) return;
      if (this.lastTimestamp !== 0) {
        this.frameTimes.push(timestamp - this.lastTimestamp);
      }
      this.lastTimestamp = timestamp;
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  stop(): FrameReport {
    this.running = false;
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);

    const totalFrames = this.frameTimes.length;
    if (totalFrames === 0) {
      return { totalFrames: 0, durationMs: 0, avgFrameMs: 0, droppedFrames: 0, p95FrameMs: 0, jsFps: 0 };
    }
    const durationMs = this.frameTimes.reduce((a, b) => a + b, 0);
    const avgFrameMs = durationMs / totalFrames;
    const droppedFrames = this.frameTimes.filter((t) => t > DROPPED_FRAME_THRESHOLD_MS).length;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95FrameMs = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    const jsFps = 1000 / avgFrameMs;

    return { totalFrames, durationMs, avgFrameMs, droppedFrames, p95FrameMs, jsFps };
  }
}

export function formatFrameReport(report: FrameReport): string {
  if (report.totalFrames === 0) return 'No frames captured';
  return [
    `${report.totalFrames} frames over ${(report.durationMs / 1000).toFixed(1)}s`,
    `avg ${report.avgFrameMs.toFixed(1)}ms (~${report.jsFps.toFixed(0)} fps)`,
    `p95 ${report.p95FrameMs.toFixed(1)}ms`,
    `${report.droppedFrames} dropped (>${DROPPED_FRAME_THRESHOLD_MS.toFixed(0)}ms)`,
  ].join(' | ');
}
