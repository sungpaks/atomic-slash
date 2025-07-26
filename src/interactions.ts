import * as THREE from "three";
import { getRandomColor } from "./utils";
import { Line2, LineGeometry, LineMaterial } from "three/examples/jsm/Addons.js";

// THREE.Vector3에 메서드 추가
declare module "three" {
  interface Vector3 {
    setFromScreenPosition(x: number, y: number, camera: THREE.Camera, targetPlane?: THREE.Plane): Vector3;
  }
}

// Vector3 프로토타입에 메서드 추가
THREE.Vector3.prototype.setFromScreenPosition = function (
  x: number,
  y: number,
  camera: THREE.Camera,
  targetPlane?: THREE.Plane
) {
  // 화면 좌표를 정규화
  const normalizedX = (x / window.innerWidth) * 2 - 1;
  const normalizedY = -(y / window.innerHeight) * 2 + 1;

  // Raycaster 생성
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);

  if (targetPlane) {
    // 특정 평면과의 교차점 계산
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(targetPlane, intersection);
    this.copy(intersection);
  } else {
    // 카메라 앞쪽 고정 거리에서의 교차점
    const distance = 1; // 카메라로부터의 거리
    const point = raycaster.ray.at(distance, new THREE.Vector3());
    this.copy(point);
  }

  return this;
};

export class SlashDetector {
  private isDragging = false;
  private startPos: { x: number; y: number } | null = null;
  private dragCount = 0;
  private readonly minDragDistance = 0.3; // 뷰포트의 30%

  constructor(private onDragComplete: (count: number) => void) {}

  start(x: number, y: number) {
    this.isDragging = true;
    this.startPos = { x, y };
  }

  move(x: number, y: number) {
    if (!this.isDragging || !this.startPos) return;

    const deltaX = Math.abs(x - this.startPos.x);
    const deltaY = Math.abs(y - this.startPos.y);

    // 뷰포트 크기 가져오기
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minDistanceX = viewportWidth * this.minDragDistance;
    const minDistanceY = viewportHeight * this.minDragDistance;

    // 드래그 거리가 충분한지 확인
    if (deltaX >= minDistanceX || deltaY >= minDistanceY) {
      this.dragCount++;
      this.onDragComplete(this.dragCount);
      this.reset();
    }
  }

  end() {
    this.reset();
  }

  private reset() {
    this.isDragging = false;
    this.startPos = null;
  }

  getDragCount() {
    return this.dragCount;
  }

  resetCount() {
    this.dragCount = 0;
  }
}

export function calculateSubdivisionLevel(dragCount: number): number {
  // 0~6회 범위에서 로그 스케일 적용
  const maxLevel = 6;

  if (dragCount === 0) return 0;

  // 로그 스케일: 1, 2, 3, 4, 5, 6 -> 1, 1, 2, 2, 3, 3
  const logScale = Math.floor(Math.log2(dragCount + 1));
  return Math.min(logScale, maxLevel);
}

export class SubdivisionTimer {
  private timer: number | null = null;
  private timeLeft = 3000; // 3초
  private isActive = false;

  constructor(
    private onTimeUp: () => void,
    private onTick: (timeLeft: number) => void
  ) {}

  start() {
    this.isActive = true;
    this.timeLeft = 3000;
    this.tick();
  }

  private tick() {
    if (!this.isActive) return;

    this.onTick(this.timeLeft);

    if (this.timeLeft <= 0) {
      this.stop();
      this.onTimeUp();
      return;
    }

    this.timeLeft -= 100; // 100ms마다 업데이트
    this.timer = setTimeout(() => this.tick(), 100);
  }

  stop() {
    this.isActive = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  isSlashMode() {
    return this.isActive;
  }
}

export class DragPathVisualizer {
  private pathPoints: { x: number; y: number }[] = [];
  private isDrawing = false;
  private pathMeshes: Line2[] = []; // 여러 개의 mesh 관리
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  start(x: number, y: number) {
    this.isDrawing = true;
    this.pathPoints = [{ x, y }];
    this.createPathMesh();
  }

  addPoint(x: number, y: number) {
    if (!this.isDrawing) return;
    this.pathPoints.push({ x, y });
    this.updateCurrentPathMesh();
  }

  end() {
    this.isDrawing = false;
    this.fadeOutCurrentPath();
  }

  private createPathMesh() {
    const points = this.pathPoints.map(point => {
      const vector = new THREE.Vector3();
      vector.setFromScreenPosition(point.x, point.y, this.camera);

      // 약간의 랜덤성 추가로 더 자연스러운 곡선
      vector.x += (Math.random() - 0.5) * 0.1;
      vector.y += (Math.random() - 0.5) * 0.1;

      return vector;
    });

    // LineGeometry 생성
    const geometry = new LineGeometry();
    const positions = new Float32Array(points.length * 3);

    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });

    geometry.setPositions(positions);

    // LineMaterial 생성
    const material = new LineMaterial({
      color: getRandomColor(),
      linewidth: 5,
      transparent: true,
      opacity: 0.8,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const pathMesh = new Line2(geometry, material);
    this.pathMeshes.push(pathMesh); // 배열에 추가
    this.scene.add(pathMesh);
  }

  // 현재 드래그 중인 mesh만 업데이트
  private updateCurrentPathMesh() {
    if (this.pathMeshes.length === 0) return;

    const currentMesh = this.pathMeshes[this.pathMeshes.length - 1];
    const points = this.pathPoints.map(point => {
      const vector = new THREE.Vector3();
      vector.setFromScreenPosition(point.x, point.y, this.camera);
      return vector;
    });

    const geometry = new LineGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });
    geometry.setPositions(positions);

    currentMesh.geometry.dispose();
    currentMesh.geometry = geometry as LineGeometry;
  }

  // 현재 드래그 중인 mesh만 페이드 아웃
  private fadeOutCurrentPath() {
    if (this.pathMeshes.length === 0) return;

    const currentMesh = this.pathMeshes[this.pathMeshes.length - 1];
    const material = currentMesh.material as LineMaterial;

    const fadeOut = () => {
      material.opacity -= 0.05;
      if (material.opacity <= 0) {
        this.removeMesh(currentMesh);
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    fadeOut();
  }

  // 특정 mesh 제거
  private removeMesh(mesh: Line2) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(material => material.dispose());
    } else {
      mesh.material.dispose();
    }

    // 배열에서 제거
    const index = this.pathMeshes.indexOf(mesh);
    if (index > -1) {
      this.pathMeshes.splice(index, 1);
    }
  }

  // 모든 mesh 정리
  clearAllPaths() {
    this.pathMeshes.forEach(mesh => this.removeMesh(mesh));
    this.pathMeshes = [];
  }

  // resolution 업데이트 (윈도우 리사이즈 시)
  updateResolution() {
    this.pathMeshes.forEach(mesh => {
      const material = mesh.material as LineMaterial;
      material.resolution.set(window.innerWidth, window.innerHeight);
    });
  }
}
