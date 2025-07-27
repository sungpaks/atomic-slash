import * as THREE from "three";
import { EXRLoader, OrbitControls, RGBELoader } from "three/examples/jsm/Addons.js";
import setEnv from "./set-env";
import "./style.css";
import { CustomCubeFactory } from "./subdividable-cube";
import { calculateSubdivisionLevel, DragPathVisualizer, SlashDetector, SubdivisionTimer } from "./interactions";

class App {
  private renderer: THREE.WebGLRenderer;
  private domApp: HTMLElement;
  private scene: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private customCubeFactory?: CustomCubeFactory;
  private cube?: THREE.Mesh;
  private dragDetector: SlashDetector;
  private subdivisionTimer: SubdivisionTimer;
  private subdivisionLevel = 0;
  private isSubdividing = false;
  private dragPathVisualizer: DragPathVisualizer;
  private rockMaterial?: THREE.MeshStandardMaterial;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.domApp = document.querySelector("#app")!;
    this.domApp.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.setupCamera();
    this.setupModel();
    this.setupLight();
    this.setupEvents();

    this.dragDetector = new SlashDetector(count => {
      this.handleDragComplete(count);
    });

    this.subdivisionTimer = new SubdivisionTimer(
      () => this.handleTimeUp(),
      timeLeft => this.updateTimer(timeLeft)
    );
    this.dragPathVisualizer = new DragPathVisualizer(this.scene, this.camera!);
  }

  private setupCamera() {
    const width = this.domApp.clientWidth;
    const height = this.domApp.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    this.camera.position.z = 2;
    this.camera.position.y = 2;
    this.camera.position.x = 3;
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }
  private async setupModel() {
    try {
      const loader = new THREE.TextureLoader();
      const exrLoader = new EXRLoader();
      const rockTextureColorMap = await loader.loadAsync("textures/rock_face_03_diff_1k.jpg");
      // const rockTextureNormalMap = await exrLoader.loadAsync("textures/rock_face_03_nor_gl_1k.exr");
      // const rockTextureRoughnessMap = await exrLoader.loadAsync("textures/rock_face_03_rough_1k.exr");
      // const rockTextureDisplacementMap = await loader.loadAsync("textures/rock_face_03_disp_1k.png");

      this.rockMaterial = new THREE.MeshStandardMaterial({
        // color: 0xffffff,
        // wireframe: true,
        // wireframeLinewidth: 5,
        side: THREE.DoubleSide,
        map: rockTextureColorMap,
        // normalMap: rockTextureNormalMap,
        // roughnessMap: rockTextureRoughnessMap,
        // displacementMap: rockTextureDisplacementMap,
      });
      this.customCubeFactory = new CustomCubeFactory();
      this.cube = new THREE.Mesh(this.customCubeFactory.getGeometry(), this.rockMaterial);

      this.scene.add(this.cube);

      // AxisHelper 추가 - X축(빨강), Y축(초록), Z축(파랑)
      // const axesHelper = new THREE.AxesHelper(2);
      // this.scene.add(axesHelper);
    } catch (error) {
      console.error(error);
    }
  }
  private async setupLight() {
    await setEnv(this.scene, this.renderer);
  }
  private render(time: number) {
    this.update(time);
    this.renderer.render(this.scene, this.camera!);
    this.controls?.update();
  }
  private resize() {
    const width = this.domApp.clientWidth;
    const height = this.domApp.clientHeight;
    const camera = this.camera;

    if (camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height);
  }
  private update(time: number) {
    if (!this.subdivisionTimer.isSlashMode() && this.subdivisionLevel > 0) {
      if (!this.isSubdividing) {
        this.isSubdividing = true;
        setTimeout(() => {
          this.performSubdivision();
          this.subdivisionLevel--;
          this.isSubdividing = false;
        }, 150);
      }
    }
  }

  private handleDragComplete(dragCount: number) {
    console.log(`${dragCount}격!`);
  }

  private performSubdivision() {
    this.customCubeFactory?.subdivideAllFaces();

    // 메시 업데이트
    const newGeometry = this.customCubeFactory?.getGeometry();
    if (this.cube && newGeometry) {
      this.cube.geometry.dispose();
      this.cube.geometry = newGeometry;
    }
  }

  private handleTimeUp() {
    this.subdivisionLevel = calculateSubdivisionLevel(this.dragDetector.getDragCount());
    console.log("시간 종료! 최종 분할 레벨:", this.subdivisionLevel);
    this.dragDetector.resetCount();
    this.dragPathVisualizer.end();
    this.scene.backgroundIntensity = 1;
    if (this.controls) {
      this.controls.enabled = true;
    }
  }

  private updateTimer(timeLeft: number) {
    const timerDiv = document.getElementById("timer");
    if (timerDiv) {
      const seconds = (timeLeft / 1000).toFixed(1);
      timerDiv.textContent = `남은 시간: ${seconds}초`;
      timerDiv.style.display = this.subdivisionTimer.isSlashMode() ? "block" : "none";
    }
  }

  setupEvents() {
    window.onresize = this.resize.bind(this);
    this.resize();
    this.renderer.setAnimationLoop(this.render.bind(this));
    const subdivideButton = document.getElementById("subdivide")!;
    subdivideButton.addEventListener("click", () => {
      if (this.controls) {
        this.controls.enabled = false;
      }
      this.customCubeFactory?.resetFaces();
      this.subdivisionTimer.start();
      const newGeometry = this.customCubeFactory?.getGeometry();
      if (this.cube && newGeometry) {
        this.cube.geometry.dispose();
        this.cube.geometry = newGeometry;
      }
      console.log("3초간 참격 상태 시작!");
      this.scene.backgroundIntensity = 0.2;
    });

    // 마우스 이벤트 추가
    this.renderer.domElement.addEventListener("mousedown", e => {
      if (this.subdivisionTimer.isSlashMode()) {
        this.dragDetector.start(e.clientX, e.clientY);
        this.dragPathVisualizer.start(e.clientX, e.clientY);
      }
    });

    this.renderer.domElement.addEventListener("mousemove", e => {
      if (this.subdivisionTimer.isSlashMode()) {
        this.dragDetector.move(e.clientX, e.clientY);
        this.dragPathVisualizer.addPoint(e.clientX, e.clientY);
      }
    });

    this.renderer.domElement.addEventListener("mouseup", () => {
      if (this.subdivisionTimer.isSlashMode()) {
        this.dragDetector.end();
        this.dragPathVisualizer.end();
      }
    });
  }
}

new App();
