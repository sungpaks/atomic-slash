import { RGBELoader } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

export default async function setEnv(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const envTexture = await new RGBELoader().loadAsync("je_gray_park_1k.hdr");
  envTexture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = envTexture;
  scene.backgroundRotation.set(0, Math.PI / 4, 0);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.5;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
}
