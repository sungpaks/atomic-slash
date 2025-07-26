import * as THREE from "three";

export interface Vertex {
  pos: [number, number, number];
  norm: [number, number, number];
  uv: [number, number];
}

export interface Face {
  vertices: Vertex[];
  indices: number[];
  normal: [number, number, number];
}

const getShrinkFactor = (): number => {
  return 0.002;
  // return Math.random() * 0.01 + 0.02; // 0.02 ~ 0.08 사이의 랜덤값
};
export const INDICES_FOR_RECT = [0, 1, 2, 2, 3, 0];

export function addMidpoints(vertices: Vertex[]): Vertex[] {
  // 기존 4개 정점
  const [v0, v1, v2, v3] = vertices;

  // 모서리 중점들 (v0-v1, v1-v2, v2-v3, v3-v0)
  const v01 = createMidpoint(v0, v1); // 0-1 중점
  const v12 = createMidpoint(v1, v2); // 1-2 중점
  const v23 = createMidpoint(v2, v3); // 2-3 중점
  const v30 = createMidpoint(v3, v0); // 3-0 중점

  // 중심점 (4개 정점의 평균)
  const center = createCenter(v0, v1, v2, v3);

  // 순서: 기존 4개 + 모서리 중점 4개 + 중심점 1개 = 총 9개
  return [v0, v1, v2, v3, v01, v12, v23, v30, center];
}

export function createMidpoint(v1: Vertex, v2: Vertex): Vertex {
  return {
    pos: [(v1.pos[0] + v2.pos[0]) / 2, (v1.pos[1] + v2.pos[1]) / 2, (v1.pos[2] + v2.pos[2]) / 2],
    norm: v1.norm, // 같은 면이므로 normal은 동일
    uv: [(v1.uv[0] + v2.uv[0]) / 2, (v1.uv[1] + v2.uv[1]) / 2],
  };
}

export function createCenter(v0: Vertex, v1: Vertex, v2: Vertex, v3: Vertex): Vertex {
  return {
    pos: [
      (v0.pos[0] + v1.pos[0] + v2.pos[0] + v3.pos[0]) / 4,
      (v0.pos[1] + v1.pos[1] + v2.pos[1] + v3.pos[1]) / 4,
      (v0.pos[2] + v1.pos[2] + v2.pos[2] + v3.pos[2]) / 4,
    ],
    norm: v0.norm, // 같은 면이므로 normal은 동일
    uv: [(v0.uv[0] + v1.uv[0] + v2.uv[0] + v3.uv[0]) / 4, (v0.uv[1] + v1.uv[1] + v2.uv[1] + v3.uv[1]) / 4],
  };
}

export function createSubFaces(vertices: Vertex[], normal: [number, number, number]): Face[] {
  // vertices 순서: [v0, v1, v2, v3, v01, v12, v23, v30, center]
  // 인덱스: [0, 1, 2, 3, 4, 5, 6, 7, 8]

  // 4개의 하위 면 생성 (각각 4개 정점)
  const subFaces: Face[] = [
    // 하위 면 1: v0-v01-center-v30
    {
      vertices: shrinkSubFace([vertices[0], vertices[4], vertices[8], vertices[7]], getShrinkFactor(), vertices[0].pos), // v0, v01, center, v30
      indices: INDICES_FOR_RECT, // v0-v01-center, center-v30-v0
      normal,
    },
    // 하위 면 2: v01-v1-v12-center
    {
      vertices: shrinkSubFace([vertices[4], vertices[1], vertices[5], vertices[8]], getShrinkFactor(), vertices[1].pos), // v01, v1, v12, center
      indices: INDICES_FOR_RECT, // v01-v1-v12, v12-center-v01
      normal,
    },
    // 하위 면 3: center-v12-v2-v23
    {
      vertices: shrinkSubFace([vertices[8], vertices[5], vertices[2], vertices[6]], getShrinkFactor(), vertices[2].pos), // center, v12, v2, v23
      indices: INDICES_FOR_RECT, // center-v12-v2, v2-v23-center
      normal,
    },
    // 하위 면 4: v30-center-v23-v3
    {
      vertices: shrinkSubFace([vertices[7], vertices[8], vertices[6], vertices[3]], getShrinkFactor(), vertices[3].pos), // v30, center, v23, v3
      indices: INDICES_FOR_RECT, // v30-center-v23, v23-v3-v30
      normal,
    },
  ];

  return subFaces;
}

function shrinkSubFace(
  vertices: Vertex[],
  shrinkAmount: number,
  notShrinkPosition: [number, number, number]
): Vertex[] {
  // 하위 면의 중심점 계산
  const center = [
    (vertices[0].pos[0] + vertices[1].pos[0] + vertices[2].pos[0] + vertices[3].pos[0]) / 4,
    (vertices[0].pos[1] + vertices[1].pos[1] + vertices[2].pos[1] + vertices[3].pos[1]) / 4,
    (vertices[0].pos[2] + vertices[1].pos[2] + vertices[2].pos[2] + vertices[3].pos[2]) / 4,
  ];

  return vertices.map(vertex => {
    // 각 축별로 이동할 방향과 거리 계산
    const dirX = center[0] - vertex.pos[0];
    const dirY = center[1] - vertex.pos[1];
    const dirZ = center[2] - vertex.pos[2];

    // 각 축별로 이동 여부 결정 (notShrinkPosition과 다른 축만 이동)
    const shouldMoveX = vertex.pos[0] !== notShrinkPosition[0];
    const shouldMoveY = vertex.pos[1] !== notShrinkPosition[1];
    const shouldMoveZ = vertex.pos[2] !== notShrinkPosition[2];

    // 각 축별 이동 거리 계산 (절대값)
    const moveX = shouldMoveX ? Math.sign(dirX) * Math.min(Math.abs(dirX), shrinkAmount) : 0;
    const moveY = shouldMoveY ? Math.sign(dirY) * Math.min(Math.abs(dirY), shrinkAmount) : 0;
    const moveZ = shouldMoveZ ? Math.sign(dirZ) * Math.min(Math.abs(dirZ), shrinkAmount) : 0;

    return {
      ...vertex,
      pos: [vertex.pos[0] + moveX, vertex.pos[1] + moveY, vertex.pos[2] + moveZ],
    };
  });
}

export function subdivideFace(face: Face): Face[] {
  // 1. 중점 추가하여 정점 수 증가 (4개 → 9개)
  const subdividedVertices = addMidpoints(face.vertices);

  // 2. 4개의 하위 면 생성
  const subFaces = createSubFaces(subdividedVertices, face.normal);

  return subFaces;
}

export class CustomCubeFactory {
  private faces: Face[] = [
    {
      // +x side (왼쪽아래 → 왼쪽위 → 오른쪽위 → 오른쪽아래)
      vertices: [
        { pos: [1, -1, -1], norm: [1, 0, 0], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [1, 1, -1], norm: [1, 0, 0], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [1, 1, 1], norm: [1, 0, 0], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [1, -1, 1], norm: [1, 0, 0], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT, // v0-v1-v2, v2-v3-v0
      normal: [1, 0, 0],
    },
    {
      // -x side
      vertices: [
        { pos: [-1, -1, -1], norm: [-1, 0, 0], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [-1, 1, -1], norm: [-1, 0, 0], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [-1, 1, 1], norm: [-1, 0, 0], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [-1, -1, 1], norm: [-1, 0, 0], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT,
      normal: [-1, 0, 0],
    },
    {
      // +y side
      vertices: [
        { pos: [-1, 1, -1], norm: [0, 1, 0], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [-1, 1, 1], norm: [0, 1, 0], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [1, 1, 1], norm: [0, 1, 0], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [1, 1, -1], norm: [0, 1, 0], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT,
      normal: [0, 1, 0],
    },
    {
      // -y side
      vertices: [
        { pos: [-1, -1, -1], norm: [0, -1, 0], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [1, -1, 1], norm: [0, -1, 0], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [1, -1, -1], norm: [0, -1, 0], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT,
      normal: [0, -1, 0],
    },
    {
      // +z side
      vertices: [
        { pos: [-1, -1, 1], norm: [0, 0, 1], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [-1, 1, 1], norm: [0, 0, 1], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [1, 1, 1], norm: [0, 0, 1], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [1, -1, 1], norm: [0, 0, 1], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT,
      normal: [0, 0, 1],
    },
    {
      // -z side
      vertices: [
        { pos: [-1, -1, -1], norm: [0, 0, -1], uv: [0, 0] }, // v0: 왼쪽아래
        { pos: [-1, 1, -1], norm: [0, 0, -1], uv: [0, 1] }, // v1: 왼쪽위
        { pos: [1, 1, -1], norm: [0, 0, -1], uv: [1, 1] }, // v2: 오른쪽위
        { pos: [1, -1, -1], norm: [0, 0, -1], uv: [1, 0] }, // v3: 오른쪽아래
      ],
      indices: INDICES_FOR_RECT,
      normal: [0, 0, -1],
    },
  ];

  private geometry?: THREE.BufferGeometry;

  constructor() {
    this.rebuildGeometry();
  }

  getGeometry() {
    return this.geometry;
  }

  subdivideAllFaces(): void {
    const newFaces: Face[] = [];

    for (const face of this.faces) {
      const subFaces = subdivideFace(face);
      newFaces.push(...subFaces);
    }

    this.faces = newFaces;
    this.rebuildGeometry();
  }

  private rebuildGeometry(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    for (const face of this.faces) {
      // 정점 데이터 추가
      for (const vertex of face.vertices) {
        positions.push(...vertex.pos);
        normals.push(...vertex.norm);
        uvs.push(...vertex.uv);
      }

      // 인덱스 추가 (offset 적용)
      for (const index of face.indices) {
        indices.push(index + vertexOffset);
      }

      vertexOffset += face.vertices.length;
    }

    // geometry 재생성
    if (this.geometry) {
      this.geometry.dispose();
    }
    this.geometry = new THREE.BufferGeometry();

    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    this.geometry.setIndex(indices);
  }
}
