import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const SCENE_URL = 'https://prod.spline.design/8XGqmhHhRaPFEFAj/scene.splinecode';

interface Props {
  onLoad?: () => void;
}

export function SplineRobot({ onLoad }: Props) {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Forward every document-level mousemove into the Spline canvas so the
  // robot's built-in "Look At cursor" keeps tracking even when the cursor
  // is over HTML content layers that sit above the canvas in z-order.
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
      {!loaded && (
        <div className="spline-loading" aria-label="Loading 3D scene">
          <span className="spline-ring" />
        </div>
      )}
      <Suspense fallback={null}>
        <Spline scene={SCENE_URL} onLoad={handleLoad} />
      </Suspense>
    </div>
  );
}
