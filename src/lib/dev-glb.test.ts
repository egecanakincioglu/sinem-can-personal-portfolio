import { describe, expect, it } from 'vitest';
import { buildDevGlb } from './dev-glb';

describe('buildDevGlb', () => {
  const glb = buildDevGlb();

  it('starts with a valid GLB header whose length matches the buffer', () => {
    expect(glb.toString('ascii', 0, 4)).toBe('glTF');
    expect(glb.readUInt32LE(4)).toBe(2);
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    expect(glb.length % 4).toBe(0);
  });

  it('has a JSON chunk followed by a BIN chunk, both four-byte aligned', () => {
    const jsonLen = glb.readUInt32LE(12);
    expect(glb.toString('ascii', 16, 20)).toBe('JSON');
    expect(jsonLen % 4).toBe(0);
    const binAt = 20 + jsonLen;
    expect(glb.toString('ascii', binAt + 4, binAt + 8)).toBe('BIN\0');
    const binLen = glb.readUInt32LE(binAt);
    expect(binLen % 4).toBe(0);
    expect(binAt + 8 + binLen).toBe(glb.length);
  });

  it('describes a mesh whose buffer length and accessor bounds are consistent', () => {
    const jsonLen = glb.readUInt32LE(12);
    const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen));
    const binLen = glb.readUInt32LE(20 + jsonLen);
    expect(json.asset.version).toBe('2.0');
    expect(json.buffers[0].byteLength).toBe(binLen);
    const { min, max, count } = json.accessors[0];
    expect(count).toBeGreaterThan(0);
    for (let k = 0; k < 3; k++) expect(max[k]).toBeGreaterThan(min[k]);
    // the model is deliberately off-origin
    expect(min[0]).toBeGreaterThan(100);
  });

  it('is deterministic', () => {
    expect(buildDevGlb().equals(glb)).toBe(true);
  });
});
