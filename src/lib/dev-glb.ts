/* ------------------------------------------------------------------------------------------------
   DEVELOPMENT DEMO MODEL — a synthetic flange (disc + hub + bolt bosses), built in memory as a binary
   glTF 2.0 (.glb). Used only by the development route app/dev-model; never attributed to Sinem CAN,
   never shipped as a file. Deliberately placed off-origin and in arbitrary units so the viewer must
   compute its framing from the real bounds.
   ------------------------------------------------------------------------------------------------ */

type Mesh = { pos: number[]; nor: number[]; idx: number[] };

/** Closed cylinder along +Y between y0 and y1, centred at (cx, cz). */
function cylinder(m: Mesh, cx: number, cz: number, r: number, y0: number, y1: number, seg = 48) {
  const base = m.pos.length / 3;
  // side ring (smooth normals)
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const c = Math.cos(a),
      s = Math.sin(a);
    m.pos.push(cx + r * c, y0, cz + r * s, cx + r * c, y1, cz + r * s);
    m.nor.push(c, 0, s, c, 0, s);
  }
  for (let i = 0; i < seg; i++) {
    const a = base + i * 2;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  // caps
  for (const [y, ny] of [
    [y0, -1],
    [y1, 1],
  ] as const) {
    const c0 = m.pos.length / 3;
    m.pos.push(cx, y, cz);
    m.nor.push(0, ny, 0);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      m.pos.push(cx + r * Math.cos(a), y, cz + r * Math.sin(a));
      m.nor.push(0, ny, 0);
    }
    for (let i = 0; i < seg; i++) {
      if (ny > 0) m.idx.push(c0, c0 + 2 + i, c0 + 1 + i);
      else m.idx.push(c0, c0 + 1 + i, c0 + 2 + i);
    }
  }
}

export function buildDevGlb(): Buffer {
  const m: Mesh = { pos: [], nor: [], idx: [] };
  // Units are arbitrary (hundreds), origin is deliberately far from the geometry.
  const OX = 340,
    OY = -120,
    OZ = 75;
  cylinder(m, OX, OZ, 90, OY, OY + 14); // flange disc
  cylinder(m, OX, OZ, 38, OY + 14, OY + 62); // hub
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cylinder(m, OX + 66 * Math.cos(a), OZ + 66 * Math.sin(a), 7, OY + 14, OY + 26, 20); // bolt heads
  }

  const pos = new Float32Array(m.pos);
  const nor = new Float32Array(m.nor);
  const idx = new Uint16Array(m.idx);
  const pad = (n: number) => (4 - (n % 4)) % 4;

  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }

  const posBytes = Buffer.from(pos.buffer);
  const norBytes = Buffer.from(nor.buffer);
  const idxBytes = Buffer.from(idx.buffer);
  const idxPad = pad(idxBytes.length);
  const bin = Buffer.concat([posBytes, norBytes, idxBytes, Buffer.alloc(idxPad)]);

  const json = {
    asset: { version: '2.0', generator: 'development demo' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'DEVELOPMENT DEMO flange' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [
      { pbrMetallicRoughness: { baseColorFactor: [0.62, 0.64, 0.6, 1], metallicFactor: 0.15, roughnessFactor: 0.7 } },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: nor.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: idx.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length, byteLength: norBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length + norBytes.length, byteLength: idxBytes.length, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  };
  let jsonBytes = Buffer.from(JSON.stringify(json));
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(pad(jsonBytes.length), 0x20)]);

  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBytes.length, 0);
  jh.write('JSON', 4, 'ascii');
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.write('BIN\0', 4, 'ascii');
  return Buffer.concat([header, jh, jsonBytes, bh, bin]);
}
