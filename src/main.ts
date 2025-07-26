import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import setEnv from "./set-env";
import "./style.css";
import { CustomCubeFactory } from "./subdividable-cube";

class App {
  private renderer: THREE.WebGLRenderer;
  private domApp: HTMLElement;
  private scene: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private cube?: CustomCubeFactory;

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
  }
  private setupCamera() {
    const width = this.domApp.clientWidth;
    const height = this.domApp.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    this.camera.position.z = 5;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }
  private setupModel() {
    const material = new THREE.MeshStandardMaterial({
      color: 0x44aa88,
      wireframe: true,
      side: THREE.DoubleSide,
      wireframeLinewidth: 5,
    });
    this.cube = new CustomCubeFactory();
    const mesh = new THREE.Mesh(this.cube.getGeometry(), material);

    this.scene.add(mesh);

    // AxisHelper 추가 - X축(빨강), Y축(초록), Z축(파랑)
    const axesHelper = new THREE.AxesHelper(2);
    this.scene.add(axesHelper);
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
    time *= 0.001;
    if (this.cube) {
      // this.cube.rotation.y = time;
      // this.cube.rotation.x = time;
    }
  }
  setupEvents() {
    window.onresize = this.resize.bind(this);
    this.resize();
    this.renderer.setAnimationLoop(this.render.bind(this));

    const subdivideButton = document.getElementById("subdivide")!;
    subdivideButton.addEventListener("click", () => {
      this.cube?.subdivideAllFaces();
      const mesh = this.scene.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
      const newGeometry = this.cube?.getGeometry();
      if (mesh && newGeometry) {
        mesh.geometry.dispose();
        mesh.geometry = newGeometry;
      }
    });
  }
}

new App();
