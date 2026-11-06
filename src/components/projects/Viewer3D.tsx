'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------------------------------------
   Interactive viewer for an approved public GLB preview.
   - three.js is imported only after the visitor presses the activation button (never on page load).
   - Rendering is on demand (controls change, resize, key/button input) — no idle animation loop.
   - Camera framing comes from the loaded model's real bounding box.
   - Everything created is disposed on unmount; a load that finishes after unmount is discarded.
   ------------------------------------------------------------------------------------------------ */

export type ViewerLabels = {
  activate: string;
  hint: string;
  instructions: string;
  loading: string;
  errorTitle: string;
  errorText: string;
  retry: string;
  reset: string;
  zoomIn: string;
  zoomOut: string;
  rotateLeft: string;
  rotateRight: string;
  rotateUp: string;
  rotateDown: string;
  canvas: string;
  sizeNote?: string;
  demo?: string;
};

type Poster = { src: string; alt: string; width: number; height: number };
type Status = 'idle' | 'loading' | 'ready' | 'error';

type Live = {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  render: () => void;
  fit: () => void;
  orbit: (dAz: number, dPol: number) => void;
  dolly: (factor: number) => void;
  dispose: () => void;
};

const STEP = Math.PI / 12;

export function Viewer3D({ modelSrc, poster, labels }: { modelSrc: string; poster: Poster; labels: ViewerLabels }) {
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const requested = status !== 'idle';

  useEffect(() => {
    if (!requested) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        if (cancelled) return;

        const gltf = await new GLTFLoader().loadAsync(modelSrc);
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const canvas = renderer.domElement;
        canvas.className = 'block h-full w-full';
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);

        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb9bfae, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        const fill = new THREE.DirectionalLight(0xffffff, 0.7);
        scene.add(key, fill);
        scene.add(gltf.scene);

        // Framing from the real bounds: the model may be off-origin and in any unit.
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, 1e-6);
        const camera = new THREE.PerspectiveCamera(35, 1, radius / 100, radius * 100);
        const controls = new OrbitControls(camera, canvas);
        controls.enablePan = false;
        controls.enableDamping = false; // damping would need a continuous loop
        controls.target.copy(sphere.center);

        let raf = 0;
        const render = () => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            // lights follow the camera so the part never goes dark while orbiting
            key.position.copy(camera.position).add(new THREE.Vector3(radius, radius, 0));
            fill.position.copy(camera.position).add(new THREE.Vector3(-radius, -radius * 0.3, radius));
            renderer.render(scene, camera);
          });
        };

        const fit = () => {
          const fovV = THREE.MathUtils.degToRad(camera.fov);
          const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
          const dist = (radius / Math.sin(Math.min(fovV, fovH) / 2)) * 1.08;
          camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(1, 0.7, 1).normalize(), dist);
          controls.minDistance = dist * 0.3;
          controls.maxDistance = dist * 3;
          controls.update();
          render();
        };

        const size = () => {
          const w = Math.max(host.clientWidth, 1);
          const h = Math.max(host.clientHeight, 1);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        size();
        fit();

        const ro = new ResizeObserver(() => {
          size();
          render();
        });
        ro.observe(host);
        controls.addEventListener('change', render);

        const spherical = new THREE.Spherical();
        const offset = new THREE.Vector3();
        const orbit = (dAz: number, dPol: number) => {
          offset.copy(camera.position).sub(controls.target);
          spherical.setFromVector3(offset);
          spherical.theta += dAz;
          spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPol, 0.05, Math.PI - 0.05);
          offset.setFromSpherical(spherical);
          camera.position.copy(controls.target).add(offset);
          controls.update();
          render();
        };
        const dolly = (factor: number) => {
          offset.copy(camera.position).sub(controls.target);
          const d = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
          camera.position.copy(controls.target).add(offset.setLength(d));
          controls.update();
          render();
        };

        live.current = {
          renderer,
          camera,
          controls,
          render,
          fit,
          orbit,
          dolly,
          dispose: () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            controls.removeEventListener('change', render);
            controls.dispose();
            disposeObject(gltf.scene);
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
          },
        };
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      live.current?.dispose();
      live.current = null;
    };
  }, [requested, attempt, modelSrc]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const v = live.current;
    if (!v) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => v.orbit(-STEP, 0),
      ArrowRight: () => v.orbit(STEP, 0),
      ArrowUp: () => v.orbit(0, -STEP),
      ArrowDown: () => v.orbit(0, STEP),
      '+': () => v.dolly(0.8),
      '=': () => v.dolly(0.8),
      '-': () => v.dolly(1.25),
      '0': v.fit,
      Home: v.fit,
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const ready = status === 'ready';
  const btn = 'ulink inline-flex min-h-11 items-center px-1 text-[15px] disabled:opacity-40';

  return (
    <div>
      <div className="relative border-[1.5px] border-grafit bg-white">
        <div
          ref={hostRef}
          tabIndex={ready ? 0 : -1}
          role="group"
          aria-label={labels.canvas}
          aria-describedby="viewer3d-help"
          onKeyDown={onKey}
          data-viewer-status={status}
          className="aspect-[4/5] w-full touch-none outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-grafit sm:aspect-[4/3] lg:aspect-[16/10]"
        />

        {labels.demo && (
          <p className="pointer-events-none absolute left-3 top-3 border border-grafit bg-white px-2 py-1 text-[13px] font-medium text-grafit">
            {labels.demo}
          </p>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.src}
              alt={poster.alt}
              width={poster.width}
              height={poster.height}
              loading="lazy"
              className="h-full w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-cizgi bg-kagit/95 px-4 py-2">
              <button
                type="button"
                onClick={() => setStatus('loading')}
                className="serif min-h-11 text-[19px] italic underline decoration-1 underline-offset-[6px] hover:decoration-2"
              >
                {labels.activate}
              </button>
              {labels.sizeNote && <span className="t-meta">{labels.sizeNote}</span>}
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div role="status" className="absolute inset-0 flex items-center justify-center bg-white/90">
            <p className="serif text-[19px] italic text-kursun">{labels.loading}</p>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="absolute inset-0 flex flex-col bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.src}
              alt={poster.alt}
              width={poster.width}
              height={poster.height}
              className="min-h-0 flex-1 object-contain opacity-60"
            />
            <div className="border-t border-cizgi bg-kagit px-4 py-3">
              <p className="font-medium">{labels.errorTitle}</p>
              <p className="t-caption mt-0.5">{labels.errorText}</p>
              <button type="button" onClick={retry} className={`${btn} -ml-1 mt-1`}>
                {labels.retry}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0" role="toolbar" aria-label={labels.canvas}>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.orbit(-STEP, 0)}>
          {labels.rotateLeft}
        </button>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.orbit(STEP, 0)}>
          {labels.rotateRight}
        </button>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.orbit(0, -STEP)}>
          {labels.rotateUp}
        </button>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.orbit(0, STEP)}>
          {labels.rotateDown}
        </button>
        <span aria-hidden className="hidden text-cizgi sm:inline">
          |
        </span>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.dolly(0.8)}>
          {labels.zoomIn}
        </button>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.dolly(1.25)}>
          {labels.zoomOut}
        </button>
        <button type="button" className={btn} disabled={!ready} onClick={() => live.current?.fit()}>
          {labels.reset}
        </button>
      </div>
      <p id="viewer3d-help" className="t-caption mt-1 max-w-[62ch]">
        {ready ? labels.instructions : labels.hint}
      </p>
    </div>
  );
}

/** Releases GPU resources of everything under a loaded glTF scene. */
function disposeObject(root: import('three').Object3D) {
  root.traverse((o) => {
    const mesh = o as import('three').Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m))
        if ((v as { isTexture?: boolean } | null)?.isTexture) (v as { dispose: () => void }).dispose();
      m.dispose();
    }
  });
}
