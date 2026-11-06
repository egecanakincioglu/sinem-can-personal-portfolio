import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Viewer3D, type ViewerLabels } from './Viewer3D.tsx';

const loads = vi.hoisted(() => ({ three: 0, loader: 0, requested: [] as string[] }));

vi.mock('three', () => {
  loads.three++;
  return {};
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class {} }));
vi.mock('three/addons/loaders/GLTFLoader.js', () => {
  loads.loader++;
  return {
    GLTFLoader: class {
      loadAsync(url: string) {
        loads.requested.push(url);
        return Promise.reject(new Error('network'));
      }
    },
  };
});

const labels: ViewerLabels = {
  activate: 'Open the 3D view',
  hint: 'Press the button to load the model.',
  instructions: 'Drag to rotate.',
  loading: 'Loading the model',
  errorTitle: 'The model could not be loaded',
  errorText: 'The picture above shows the part.',
  retry: 'Try again',
  reset: 'Reset view',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  rotateUp: 'Rotate up',
  rotateDown: 'Rotate down',
  canvas: 'Model viewer',
};
const poster = { src: '/images/test-poster.png', alt: 'Test part, front view', width: 800, height: 600 };

beforeEach(() => {
  loads.three = 0;
  loads.loader = 0;
  loads.requested = [];
});
afterEach(cleanup);

describe('Viewer3D', () => {
  it('shows the poster and an activation button, and loads nothing on mount', () => {
    render(<Viewer3D modelSrc="/models/test.glb" poster={poster} labels={labels} />);
    const img = screen.getByRole('img', { name: poster.alt });
    expect(img.getAttribute('src')).toBe(poster.src);
    expect(screen.getByRole('button', { name: labels.activate })).toBeTruthy();
    expect(screen.getByText(labels.hint)).toBeTruthy();
    expect(loads.three).toBe(0);
    expect(loads.loader).toBe(0);
    expect(loads.requested).toEqual([]);
  });

  it('keeps the view controls disabled until the model is ready', () => {
    render(<Viewer3D modelSrc="/models/test.glb" poster={poster} labels={labels} />);
    for (const name of [labels.rotateLeft, labels.zoomIn, labels.reset]) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('uses the paper colour, not white, and keeps disabled controls legible', () => {
    const { container } = render(<Viewer3D modelSrc="/models/test.glb" poster={poster} labels={labels} />);
    expect(container.innerHTML).not.toContain('bg-white');
    const btn = screen.getByRole('button', { name: labels.rotateLeft });
    expect(btn.className).toContain('disabled:text-kursun');
    expect(btn.className).not.toContain('opacity');
  });

  it('loads three.js and the model only after the button is pressed', async () => {
    render(<Viewer3D modelSrc="/models/test.glb" poster={poster} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: labels.activate }));

    await waitFor(() => expect(loads.requested).toEqual(['/models/test.glb']));
    expect(loads.three).toBe(1);
    expect(loads.loader).toBe(1);
  });

  it('falls back to the poster with a retry when the model fails to load', async () => {
    render(<Viewer3D modelSrc="/models/test.glb" poster={poster} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: labels.activate }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(labels.errorTitle);
    expect(alert.querySelector('img')?.getAttribute('src')).toBe(poster.src);

    fireEvent.click(screen.getByRole('button', { name: labels.retry }));
    await waitFor(() => expect(loads.requested).toHaveLength(2));
  });
});
