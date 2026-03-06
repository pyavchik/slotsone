import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const SCENE_URL = '/robot.splinecode';

export function SplineRobot() {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  // Forward every document-level mousemove to the Spline canvas so the
  // robot tracks the cursor even when hovering over content layers above it.
  useEffect(() => {
    if (!loaded) return;
    const canvas = containerRef.current?.querySelector('canvas');
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
    <div ref={containerRef} className={`spline-bg${loaded ? ' spline-bg--ready' : ''}`}>
      <Suspense fallback={null}>
        <Spline scene={SCENE_URL} onLoad={handleLoad} />
      </Suspense>
    </div>
  );
}
