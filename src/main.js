import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LoadingManager } from './loadingmanager.js';
import { Howl } from 'howler';

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

// Initialize loading manager WITH callback to fix async error
const loadingManager = new LoadingManager(() => {
    console.log('Scene transition complete!');
    startAudio();
    showMusicFooter();
});

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Add this after your variable declarations
let backgroundMusic;
let ambientNoise;
let audioStarted = false;
// Function to initialize and play audio
function startAudio() {
    if (audioStarted) return;
    
    // Initialize background music
    backgroundMusic = new Howl({
        src: ['./assets/audio/17. Rito Village (Night).ogg'],
        volume: .33,
        loop: true,
        autoplay: false,
        onplayerror: function() {
            console.warn('Background music failed to play automatically');
            // Try to play on user interaction
            document.addEventListener('click', function playOnClick() {
                backgroundMusic.play();
                document.removeEventListener('click', playOnClick);
            });
        }
    });

    // Initialize ambient noise
    ambientNoise = new Howl({
        src: ['./assets/audio/tape-player-sounds-90780.mp3'],
        volume: .66,
        loop: false,
        autoplay: true
    });
    // Schedule audio with delays
    setTimeout(() => {
        backgroundMusic.play();
        console.log('Background music started after delay');
    }, 6000); // 6 second delay for music



    audioStarted = true;
    console.log('Audio started');
}

// Function to stop all audio
function stopAudio() {
    if (backgroundMusic) {
        backgroundMusic.stop();
    }
    if (ambientNoise) {
        ambientNoise.stop();
    }
    audioStarted = false;
}

// Function to adjust audio volumes
function setAudioVolumes(musicVolume = 0.3, ambientVolume = 0.1) {
    if (backgroundMusic) {
        backgroundMusic.volume(musicVolume);
    }
    if (ambientNoise) {
        ambientNoise.volume(ambientVolume);
    }
}

function showMusicFooter() {
    const footer = document.getElementById('music-footer');
    if (footer) {
        setTimeout(() => {
            footer.classList.add('visible');
            console.log('Music footer displayed');
            // Hide after 8 seconds
            setTimeout(() => {
                footer.classList.remove('visible');
                console.log('Music footer hidden');
            }, 8000);
        }, 500);
    }
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
        { path: './assets/textures/TV_lightmap.png', name: 'TV' },
        { path: './assets/textures/Wall_lightmap.png', name: 'Wall' },
        { path: './assets/textures/Ship_Lights_Fan_lightmap.png', name: 'Ship_Lights_Fan' },
        { path: './assets/textures/PaperWall_lightmap.png', name: 'PaperWall' },
        { path: './assets/textures/Wood_lightmap.png', name: 'Wood' },
        { path: './assets/textures/Cupboard_lightmap.png', name: 'Cupboard' },
        { path: './assets/textures/Book&Posters_lightmap.png', name: 'Book&Posters' },
        { path: './assets/textures/Mat_lightmap.webp', name: 'Mat' },
        { path: './assets/textures/FloorItems_lightmap.png', name: 'FloorItems' }
    ]
};

// Track loading progress for simultaneous loading
let glbLoaded = false;
let glbProgress = 0;
let texturesLoaded = 0;
let totalTextures = assets.textures.length;

// Function to update overall progress for simultaneous loading
function updateOverallProgress() {
    if (loadingManager.isDestroyed) return;
    
    let overallProgress;
    
    // For simultaneous loading, we weight the progress:
    // GLB is 70% of the total progress, Textures are 30%
    const glbWeightedProgress = glbProgress * 0.7;
    const texturesWeightedProgress = (texturesLoaded / totalTextures) * 100 * 0.3;
    
    overallProgress = glbWeightedProgress + texturesWeightedProgress;
    
    // Ensure we don't exceed 100%
    overallProgress = Math.min(100, overallProgress);
    
    // Determine which phase we're in for the LoadingManager
    if (glbProgress < 100) {
        loadingManager.updateProgress('glb', overallProgress);
    } else {
        loadingManager.updateProgress('textures', overallProgress);
    }
    
    console.log(`GLB: ${glbProgress.toFixed(1)}%, Textures: ${texturesLoaded}/${totalTextures}, Overall: ${overallProgress.toFixed(1)}%`);
}

// Load all textures in parallel
function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    assets.textures.forEach(textureInfo => {
        textureLoader.load(
            textureInfo.path,
            (texture) => {
                if (loadingManager.isDestroyed) return;
                // Process texture
                texture.channel = 1;
                texture.flipY = false;
                texture.colorSpace = THREE.LinearSRGBColorSpace;
                texturesLoaded++;
                updateOverallProgress();
                
                // Check if everything is loaded
                if (texturesLoaded === totalTextures && glbLoaded) {
                    applyTexturesToModel();
                    loadingManager.complete();
                }
            },
            undefined,
            (error) => {
                console.error(`Error loading texture: ${textureInfo.path}`, error);
                if (!loadingManager.isDestroyed) {
                    texturesLoaded++;
                    updateOverallProgress();
                    
                    if (texturesLoaded === totalTextures && glbLoaded) {
                        applyTexturesToModel();
                        loadingManager.complete();
                    }
                }
            }
        );
    });
}

// Apply loaded textures to the model
function applyTexturesToModel() {
    if (!gltfModel || loadingManager.isDestroyed) return;
    
    const textureLoader = new THREE.TextureLoader();
    
    gltfModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mat = child.material;
            const textureName = mat.name;
            
            const textureInfo = assets.textures.find(t => t.name === textureName);
            if (textureInfo) {
                textureLoader.load(
                    textureInfo.path,
                    (texture) => {
                        texture.channel = 1;
                        texture.flipY = false;
                        texture.colorSpace = THREE.LinearSRGBColorSpace;
                        mat.lightMap = texture;
                        mat.lightMapIntensity = LStrength;
                        mat.needsUpdate = true;
                        materialsWithLightMaps.push(mat);
                        
                        applyMaterialSettings(mat, textureName);
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to apply texture ${textureName}, continuing without it`);
                    }
                );
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

let gltfModel = null;

// Load GLTF model
const loader = new GLTFLoader();
loader.load('./assets/models/textured.glb', (gltf) => {
    if (loadingManager.isDestroyed) return;
    
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
    gltfModel = gltf.scene;
    scene.add(gltf.scene);
    
    // Mark GLB as loaded
    glbLoaded = true;
    glbProgress = 100;
    updateOverallProgress();
    
    // Check if textures are already loaded
    if (texturesLoaded === totalTextures) {
        applyTexturesToModel();
        loadingManager.complete();
    }
}, 
// GLB Progress callback
(xhr) => {
    if (loadingManager.isDestroyed) return;
    glbProgress = (xhr.loaded / xhr.total) * 100;
    updateOverallProgress();
},
// GLB Error callback
(error) => {
    console.error('Error loading GLTF:', error);
    if (!loadingManager.isDestroyed) {
        loadingManager.error();
    }
});

// START LOADING ALL ASSETS SIMULTANEOUSLY
loadTextures();

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

// Add gradient background to the scene
function createTwilightGradient() {
    const geometry = new THREE.SphereGeometry(50, 32, 32);
    
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        varying vec3 vWorldPosition;
        void main() {
            float mixFactor = smoothstep(-10.0, 10.0, vWorldPosition.y);
            
            // Deep peach to mysterious indigo
            vec3 deepPeach = vec3(0.35, 0.2, 0.15);   // #593326
            vec3 indigo = vec3(0.1, 0.08, 0.25);      // #1A1440
            
            vec3 color = mix(deepPeach, indigo, mixFactor);
            
            // Add some star-like sparkles
            float sparkle = fract(sin(dot(vWorldPosition.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            if (sparkle > 0.98) {
                color += vec3(0.1, 0.08, 0.15);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    });
    
    const backgroundSphere = new THREE.Mesh(geometry, material);
    scene.add(backgroundSphere);
}
createTwilightGradient();