import { lazy, Suspense, useCallback, useState } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const SCENE_URL = 'https://prod.spline.design/8XGqmhHhRaPFEFAj/scene.splinecode';

export function SplineRobot() {
  const [loaded, setLoaded] = useState(false);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div className={`spline-stage${loaded ? ' is-loaded' : ''}`} aria-hidden="true">
      <div className="spline-loader">
        <div className="spline-ring" />
        <span className="spline-hint">Loading 3D scene…</span>
      </div>
      <Suspense fallback={null}>
        <Spline scene={SCENE_URL} onLoad={onLoad} />
      </Suspense>
    </div>
  );
}
