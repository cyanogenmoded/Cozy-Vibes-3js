import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { GUI } from 'lil-gui'



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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
const composer = new EffectComposer(renderer);

import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom effect
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2, // Strength
    .1,   // Bloom radius
    2   // Luminance threshold
);
composer.addPass(bloomPass);

const gui = new GUI();

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

// Add GUI control that updates materials when changed
// gui.add({ LStrength }, 'LStrength', 0, 40).onChange(function (value) {
//     LStrength = value;
//     updateLightMapIntensities();
// });

// // Bloom folder
// const bloomfolder = gui.addFolder('Bloom Effect');
// bloomfolder.add(bloomPass, 'strength').min(0).max(5).step(0.1).name('Strength');
// bloomfolder.add(bloomPass, 'radius').min(0).max(5).step(0.1).name('Radius');
// bloomfolder.add(bloomPass, 'threshold').min(0).max(5).step(0.1).name('Threshold');

// Lighting folder
// const lightFolder = gui.addFolder('Lighting');
// lightFolder.close();
// const lavaLampLightFolder = lightFolder.addFolder('Lava Lamp Light');
// lavaLampLightFolder.add(lavaLampLight, 'intensity').min(0).max(5).step(0.05).name('Intensity');
// lavaLampLightFolder.add(lavaLampLight, 'visible').name('Enabled');
// lavaLampLightFolder.add(lavaLampLight.position, 'x').min(-5).max(5).step(0.05).name('X Position');
// lavaLampLightFolder.add(lavaLampLight.position, 'y').min(-5).max(5).step(0.05).name('Y Position');
// lavaLampLightFolder.add(lavaLampLight.position, 'z').min(-5).max(5).step(0.05).name('Z Position');

// const TVLightFolder = lightFolder.addFolder('Point Light 2');
// TVLightFolder.add(TVLight, 'intensity').min(0).max(5).step(0.05).name('Intensity');
// TVLightFolder.add(TVLight, 'visible').name('Enabled');
// TVLightFolder.add(TVLight.position, 'x').min(-5).max(5).step(0.05).name('X Position');
// TVLightFolder.add(TVLight.position, 'y').min(-5).max(5).step(0.05).name('Y Position');
// TVLightFolder.add(TVLight.position, 'z').min(-5).max(5).step(0.05).name('Z Position');

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
loader.load('src/assets/models/textured.glb', (gltf) => {
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
                setupLightMap('src/assets/textures/TV_lightmap.png');
                 mat.metalness = .66;
                 mat.emissiveIntensity = 8;
            }
            if (mat.name === 'Wall') {
                setupLightMap('src/assets/textures/Wall_lightmap.png');
            }
            if (mat.name === 'Ship_Lights_Fan') {
                setupLightMap('src/assets/textures/Ship_Lights_Fan_lightmap.png');
                mat.metalness = .3;
            }
            if (mat.name === 'PaperWall') {
                setupLightMap('src/assets/textures/PaperWall_lightmap.png');
            }
            if (mat.name === 'Wood') {
                setupLightMap('src/assets/textures/Wood_lightmap.png');
            }
            
            if (mat.name === 'Cupboard') {
                setupLightMap('src/assets/textures/Cupboard_lightmap.png');
                 mat.metalness = .66;
            }
            if (mat.name === 'Book&Posters') {
                setupLightMap('src/assets/textures/Book&Posters_lightmap.png');
                 mat.metalness = .66;
            }
        }
    })
    scene.add(gltf.scene)
})
loader.load('src/assets/models/textured1.glb', (gltf) => {
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
            if (mat.name === 'Mat') {
                setupLightMap('src/assets/textures/Mat_lightmap.png');
                mat.lightMapIntensity = 22
            }
            if (mat.name === 'FloorItems') {
                setupLightMap('src/assets/textures/FloorItems_lightmap.png');
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