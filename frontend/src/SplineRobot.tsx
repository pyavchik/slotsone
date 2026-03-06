import { useEffect, useRef, useState } from 'react';
import { Application } from '@splinetool/runtime';

const SCENE_URL = 'https://prod.spline.design/ybMZfIZe8twskrvI/scene.splinecode';

export function SplineRobot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const app = new Application(canvas);
    app.load(SCENE_URL).then(() => setLoaded(true));

    return () => app.dispose();
  }, []);

  // Forward document-level mousemove to the canvas so the robot tracks
  // the cursor even when hovering over content layers above it.
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const forward = (e: MouseEvent) => {
      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
        })
      );
    };

    document.addEventListener('mousemove', forward, { passive: true });
    return () => document.removeEventListener('mousemove', forward);
  }, [loaded]);

  return (
    <div className={`spline-bg${loaded ? ' spline-bg--ready' : ''}`}>
      <canvas ref={canvasRef} id="canvas3d" />
    </div>
  );
}
