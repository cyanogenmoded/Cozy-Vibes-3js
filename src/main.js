import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LoadingManager } from './loadingmanager.js';

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

// Initialize loading manager
const loadingManager = new LoadingManager();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

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
controls.minAzimuthAngle = 0; 
controls.maxAzimuthAngle = Math.PI / 2;  
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 3;
controls.maxDistance = 6;
controls.target.set(0.4, 0.8, -.2);

// Enhanced lighting setup
scene.add(new THREE.AmbientLight(0xffffff, 1))

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

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2,
    .1,
    2
);
composer.addPass(bloomPass);

const materialsWithLightMaps = [];
let LStrength = 30;

function animateLavaLamp() {
    const time = Date.now() * 0.001;
    lavaLampLight.intensity = .66 + Math.sin(time * 2) * 0.5;
}

// Define all assets to load
const assets = {
    textures: [
        { path: '/assets/textures/TV_lightmap.png', name: 'TV' },
        { path: '/assets/textures/Wall_lightmap.png', name: 'Wall' },
        { path: '/assets/textures/Ship_Lights_Fan_lightmap.png', name: 'Ship_Lights_Fan' },
        { path: '/assets/textures/PaperWall_lightmap.png', name: 'PaperWall' },
        { path: '/assets/textures/Wood_lightmap.png', name: 'Wood' },
        { path: '/assets/textures/Cupboard_lightmap.png', name: 'Cupboard' },
        { path: '/assets/textures/Book&Posters_lightmap.png', name: 'Book&Posters' },
        { path: '/assets/textures/Mat_lightmap.png', name: 'Mat' },
        { path: '/assets/textures/FloorItems_lightmap.png', name: 'FloorItems' }
    ]
};

// Track loading progress
let totalAssets = assets.textures.length + 1; // +1 for GLTF
let loadedAssets = 0;
let gltfModel = null;
const loadedTextures = new Map();

// Function to update overall progress
function updateOverallProgress() {
    loadedAssets++;
    const progress = (loadedAssets / totalAssets) * 100;
    
    if (loadedAssets <= 1) {
        // First asset is GLTF (0-70%)
        loadingManager.updateProgress('glb', (loadedAssets / 1) * 100);
    } else {
        // Remaining assets are textures (70-100%)
        const textureProgress = ((loadedAssets - 1) / (totalAssets - 1)) * 100;
        loadingManager.updateProgress('textures', textureProgress);
    }
    
    if (loadedAssets === totalAssets) {
        // All assets loaded, apply textures to model
        applyTexturesToModel();
        setTimeout(() => loadingManager.complete(), 500);
    }
}

// Load all textures in parallel
function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    assets.textures.forEach(textureInfo => {
        textureLoader.load(
            textureInfo.path,
            (texture) => {
                // Process texture
                texture.channel = 1;
                texture.flipY = false;
                texture.colorSpace = THREE.LinearSRGBColorSpace;
                loadedTextures.set(textureInfo.name, texture);
                updateOverallProgress();
            },
            undefined, // No progress for individual textures
            (error) => {
                console.error(`Error loading texture: ${textureInfo.path}`, error);
                updateOverallProgress(); // Continue even if one texture fails
            }
        );
    });
}

// Apply loaded textures to the model
function applyTexturesToModel() {
    if (!gltfModel) return;
    
    gltfModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mat = child.material;
            const textureName = mat.name;
            
            if (loadedTextures.has(textureName)) {
                const lightmap = loadedTextures.get(textureName);
                mat.lightMap = lightmap;
                mat.lightMapIntensity = LStrength;
                mat.needsUpdate = true;
                materialsWithLightMaps.push(mat);
                
                // Apply material-specific settings
                applyMaterialSettings(mat, textureName);
            }
        }
    });
}

// Material-specific settings
function applyMaterialSettings(mat, name) {
    switch (name) {
        case 'TV':
            mat.metalness = .66;
            mat.emissiveIntensity = 8;
            break;
        case 'Ship_Lights_Fan':
            mat.metalness = .3;
            break;
        case 'Cupboard':
        case 'Book&Posters':
        case 'FloorItems':
            mat.metalness = .66;
            break;
        case 'Mat':
            mat.lightMapIntensity = 22;
            break;
    }
}

// Load GLTF model
const loader = new GLTFLoader();
loader.load('/assets/models/textured.glb', (gltf) => {
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltfModel = gltf.scene;
    scene.add(gltf.scene);
    
    // Update progress for GLTF
    updateOverallProgress();
}, 
// GLB Progress callback
(xhr) => {
    // Optional: if you want more granular GLTF progress
    const glbProgress = (xhr.loaded / xhr.total * 100);
    loadingManager.updateProgress('glb', glbProgress * 0.7);
},
// GLB Error callback
(error) => {
    console.error('Error loading GLTF:', error);
    loadingManager.error();
});

// START LOADING ALL ASSETS SIMULTANEOUSLY
loadTextures(); // Start texture loading immediately

scene.fog = new THREE.FogExp2(0x222233, 0.02);

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(sizes.width, sizes.height);
    bloomPass.setSize(sizes.width, sizes.height);
});

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let mixer;
const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }
    animateLavaLamp();
    controls.update();
    composer.render();
    requestAnimationFrame(animate);
}
animate();