import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import { GUI } from 'lil-gui'

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let lastPosition = new THREE.Vector3();
let lastTarget = new THREE.Vector3();
const positionThreshold = 0.01; // Only log if movement > 0.01 units

const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100)
camera.position.set(2.8, 1.55, 4.27)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = .13

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.025
// Essential settings for interior scenes
controls.minAzimuthAngle = 0; 
controls.maxAzimuthAngle = Math.PI / 2;  
controls.minPolarAngle = 0;     // Can look straight down
controls.maxPolarAngle = Math.PI / 2; // Prevent going below floor
controls.minDistance = 3;  // Don't get too close
controls.maxDistance = 6;   // Don't get too far
controls.target.set(0.4, 0.8, -.2); // Look at center of room at eye level

// Enhanced lighting setup
scene.add(new THREE.AmbientLight(0xffffff, 1))

// Add some point lights for better illumination
const lavaLampLight = new THREE.PointLight(0xffaa33, 0.4, 20)
lavaLampLight.position.set(0.9, .8, .45)
lavaLampLight.castShadow = true
scene.add(lavaLampLight)


const TVLight = new THREE.PointLight(0x77aaff, 1.5, 20)
TVLight.position.set(1.35, .85, .75)
TVLight.castShadow = true
scene.add(TVLight)

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom effect
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2, // Strength
    .1,   // Bloom radius
    2   // Luminance threshold
);
composer.addPass(bloomPass);

// const gui = new GUI();

// Create an array to store all materials that have lightmaps
const materialsWithLightMaps = [];

let LStrength = 30;

// Function to update all lightmap intensities
function updateLightMapIntensities() {
    materialsWithLightMaps.forEach(material => {
        material.lightMapIntensity = LStrength;
        material.needsUpdate = true;
    });
}

function animateLavaLamp() {
    const time = Date.now() * 0.001;
    // lavaLampLight.color.setHSL(Math.sin(time * 0.5) * 0.1 + 0.7, 0.8, 0.6);
    lavaLampLight.intensity = .66 + Math.sin(time * 2) * 0.5;
}

const textureLoader = new THREE.TextureLoader();

// Animation mixer for any animations in your GLTF
let mixer;
// GLTF Load
const loader = new GLTFLoader();
loader.load('/assets/models/textured.glb', (gltf) => {
    gltf.scene.position.set(0, 0, 0)
    gltf.scene.scale.set(1, 1, 1)
    
    gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
            const mat = child.material;
            
            // Helper function to setup lightmap
            const setupLightMap = (texturePath) => {
                const lightmap = textureLoader.load(texturePath);
                lightmap.channel = 1;
                lightmap.flipY = false;
                lightmap.colorSpace = THREE.LinearSRGBColorSpace;
                mat.lightMap = lightmap;
                mat.lightMapIntensity = LStrength;
                mat.needsUpdate = true;
                materialsWithLightMaps.push(mat);
            };
            if (mat.name === 'TV') {
                setupLightMap('/assets/textures/TV_lightmap.png');
                 mat.metalness = .66;
                 mat.emissiveIntensity = 8;
            }
            if (mat.name === 'Wall') {
                setupLightMap('/assets/textures/Wall_lightmap.png');
            }
            if (mat.name === 'Ship_Lights_Fan') {
                setupLightMap('/assets/textures/Ship_Lights_Fan_lightmap.png');
                mat.metalness = .3;
            }
            if (mat.name === 'PaperWall') {
                setupLightMap('/assets/textures/PaperWall_lightmap.png');
            }
            if (mat.name === 'Wood') {
                setupLightMap('/assets/textures/Wood_lightmap.png');
            }
            
            if (mat.name === 'Cupboard') {
                setupLightMap('/assets/textures/Cupboard_lightmap.png');
                 mat.metalness = .66;
            }
            if (mat.name === 'Book&Posters') {
                setupLightMap('/assets/textures/Book&Posters_lightmap.png');
                 mat.metalness = .66;
            }
            if (mat.name === 'Mat') {
                setupLightMap('/assets/textures/Mat_lightmap.png');
                mat.lightMapIntensity = 22
            }
            if (mat.name === 'FloorItems') {
                setupLightMap('/assets/textures/FloorItems_lightmap.png');
                 mat.metalness = .66;
            }
        }
    })
    scene.add(gltf.scene)
})

// Add fog for atmosphere
scene.fog = new THREE.Fog(0x222233, 10, 50);
// More atmospheric fog
scene.fog = new THREE.FogExp2(0x222233, 0.02); // Exponential fog for better distance falloff


// Resize handling
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    composer.setSize(sizes.width, sizes.height)
    bloomPass.setSize(sizes.width, sizes.height)
})

// Enable shadows
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// Animation loop
const clock = new THREE.Clock()
function animate() {
    const delta = clock.getDelta();
    
    // Update animations
    if (mixer) {
        mixer.update(delta);
    }
    animateLavaLamp();
    controls.update()

    composer.render()
    requestAnimationFrame(animate)
}
animate()