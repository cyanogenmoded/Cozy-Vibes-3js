export class LoadingManager {
    constructor(onTransitionComplete) {
        this.onTransitionComplete = onTransitionComplete;
        this.isDestroyed = false;
        this.animationTimeouts = [];
        this.loadingScreen = this.createLoadingScreen();
        this.progressNumber = this.loadingScreen.querySelector('.progress-number');
        this.progressBar = this.loadingScreen.querySelector('.progress-bar');
        this.currentPhase = 'glb';
        this.glbProgress = 0;
        this.texturesProgress = 0;
    }

    createLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="crt-overlay">
                <div class="lens-distortion"></div>
                <div class="content-layer">
                    <div class="progress-container">
                        <div class="progress-number">0</div>
                        <div class="progress-bar"></div>
                    </div>
                </div>
                <div class="scanlines"></div>
                <div class="vignette"></div>
                <div class="transition-overlay"></div>
            </div>
        `;
        
        const styles = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Share+Tech+Mono&display=swap');
                
                .loading-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #0a0a0a;
                    display: flex;
                    align-items: flex-end;
                    z-index: 1000;
                    font-family: 'Orbitron', monospace;
                    padding: 0;
                    margin: 0;
                    overflow: hidden;
                    
                    /* CRT Turn On Animation */
                    animation: crtTurnOn 2s cubic-bezier(0.230, 1.000, 0.320, 1.000) forwards;
                }
                
                .crt-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }
                
                /* Transition overlay - starts fully black */
                .transition-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #000000;
                    z-index: 5;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 2s ease-in-out;
                }
                
                /* Content layer - behind scanlines */
                .content-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: flex-end;
                    z-index: 1;
                }
                
                /* Lens Distortion Effect */
                .lens-distortion {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: 
                        radial-gradient(
                            ellipse at center,
                            transparent 0%,
                            transparent 40%,
                            rgba(0, 30, 0, 0.1) 70%,
                            rgba(0, 20, 0, 0.3) 100%
                        );
                    border-radius: 2px;
                    box-shadow: 
                        inset 0 0 60px rgba(0, 255, 0, 0.1),
                        inset 0 0 120px rgba(0, 255, 0, 0.05);
                    filter: brightness(1.1) contrast(1.2);
                    z-index: 1;
                }
                
                /* Scanlines covering entire screen - on top of content */
                .scanlines {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to bottom,
                        transparent 50%,
                        rgba(0, 0, 0, 0.4) 50%
                    );
                    background-size: 100% 3px;
                    animation: scanlineMove 0.08s linear infinite;
                    pointer-events: none;
                    z-index: 3;
                    mix-blend-mode: multiply;
                }
                
                /* Vignette effect */
                .vignette {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(
                        ellipse at center,
                        transparent 0%,
                        transparent 60%,
                        rgba(0, 0, 0, 0.6) 100%
                    );
                    pointer-events: none;
                    z-index: 2;
                }
                
                .progress-container {
                    width: 100%;
                    padding: 30px;
                    box-sizing: border-box;
                    position: relative;
                    
                    /* Initial hidden state for turn-on animation */
                    opacity: 0;
                    animation: fadeInContent 0.5s ease 1.5s forwards;
                }
                
                .progress-number {
                    font-size: 30vh;
                    font-weight: 900;
                    color: #00cc00;
                    text-shadow: 
                        0 0 5px #00ff00,
                        0 0 10px #00ff00,
                        0 0 15px rgba(0, 255, 0, 0.5);
                    margin-bottom: 20px;
                    letter-spacing: -2px;
                    line-height: 0.8;
                    font-feature-settings: "tnum";
                    font-variant-numeric: tabular-nums;
                    filter: brightness(1.1) contrast(1.3);
                    text-rendering: optimizeSpeed;
                    -webkit-font-smoothing: none;
                    -moz-osx-font-smoothing: grayscale;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background: rgba(0, 255, 0, 0.15);
                    position: relative;
                    overflow: hidden;
                    border-radius: 2px;
                }
                
                .progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 0%;
                    background: #00cc00;
                    box-shadow: 
                        0 0 5px #00ff00,
                        0 0 10px rgba(0, 255, 0, 0.5);
                    transition: width 0.3s ease;
                    border-radius: 2px;
                }
                
                /* CRT Turn On Animation */
                @keyframes crtTurnOn {
                    0% {
                        transform: scale(1, 0.8) translate3d(0, 0, 0);
                        filter: brightness(30);
                        opacity: 1;
                    }
                    3.5% {
                        transform: scale(1, 0.8) translate3d(0, 100%, 0);
                    }
                    3.6% {
                        transform: scale(1, 0.8) translate3d(0, -100%, 0);
                        opacity: 1;
                    }
                    9% {
                        transform: scale(1.3, 0.6) translate3d(0, 100%, 0);
                        filter: brightness(30);
                        opacity: 0;
                    }
                    11% {
                        transform: scale(1, 1) translate3d(0, 0, 0);
                        filter: contrast(0) brightness(0);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1, 1) translate3d(0, 0, 0);
                        filter: contrast(1) brightness(1.2) saturate(1.3);
                        opacity: 1;
                    }
                }
                
                /* CRT Turn Off Animation */
                @keyframes crtTurnOff {
                    0% {
                        transform: scale(1, 1.3) translate3d(0, 0, 0);
                        filter: brightness(1);
                        opacity: 1;
                    }
                    60% {
                        transform: scale(1.3, 0.001) translate3d(0, 0, 0);
                        filter: brightness(10);
                    }
                    100% {
                        transform: scale(0.000, 0.0001) translate3d(0, 0, 0);
                        filter: brightness(50);
                        opacity: 0;
                    }
                }
                
                /* Content fade in after CRT turns on */
                @keyframes fadeInContent {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Moving scanlines */
                @keyframes scanlineMove {
                    0% { transform: translateY(0px); }
                    100% { transform: translateY(3px); }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.appendChild(loadingScreen);
        
        return loadingScreen;
    }

    updateProgress(phase, progress) {
        if (this.isDestroyed) return;
        
        if (phase === 'glb') {
            this.glbProgress = progress;
            this.currentPhase = 'glb';
        } else if (phase === 'textures') {
            this.texturesProgress = progress;
            this.currentPhase = 'textures';
        }
        
        let overallProgress;
        if (this.currentPhase === 'glb') {
            overallProgress = this.glbProgress * 0.7;
        } else {
            overallProgress = 70 + (this.texturesProgress * 0.3);
        }
        
        const roundedProgress = Math.round(overallProgress);
        
        this.progressNumber.textContent = roundedProgress;
        this.progressBar.style.setProperty('--progress-width', `${overallProgress}%`);
        
        if (roundedProgress === 100) {
            this.progressNumber.style.color = '#80ff80';
            this.progressNumber.style.textShadow = 
                '0 0 5px #80ff80, 0 0 10px #80ff80, 0 0 15px rgba(128, 255, 128, 0.7)';
        }
    }

    complete() {
        if (this.isDestroyed) return;
        
        // Final completion effect
        this.progressNumber.textContent = '100';
        this.progressBar.style.setProperty('--progress-width', '100%');
        
        // Change to completion color
        this.progressNumber.style.color = '#80ff80';
        this.progressNumber.style.textShadow = 
            '0 0 8px #80ff80, 0 0 16px #80ff80, 0 0 24px rgba(128, 255, 128, 0.8)';
        
        // Use setTimeout with proper cleanup
        const timeoutId = setTimeout(() => {
            if (!this.isDestroyed) {
                this.startTransitionSequence();
            }
        }, 800);
        
        this.animationTimeouts.push(timeoutId);
    }

    startTransitionSequence() {
        if (this.isDestroyed) return;
        
        const transitionOverlay = this.loadingScreen.querySelector('.transition-overlay');
        
        // Step 1: CRT shutdown
        this.loadingScreen.style.animation = 'crtTurnOff 0.8s cubic-bezier(0.755, 0.050, 0.855, 0.060) forwards';
        
        // Step 2: After CRT shuts down, start scene transition
        const timeout1 = setTimeout(() => {
            if (this.isDestroyed) return;
            
            // Fade to black
            transitionOverlay.style.opacity = '1';
            
            // Step 3: Slowly fade from black to scene over 2 seconds
            const timeout2 = setTimeout(() => {
                if (this.isDestroyed) return;
                
                transitionOverlay.style.opacity = '0';
                
                // Step 4: Remove loading screen and call completion callback
                const timeout3 = setTimeout(() => {
                    if (!this.isDestroyed) {
                        this.destroy();
                        if (this.onTransitionComplete) {
                            this.onTransitionComplete();
                        }
                    }
                }, 2000);
                
                this.animationTimeouts.push(timeout3);
            }, 100);
            
            this.animationTimeouts.push(timeout2);
        }, 800);
        
        this.animationTimeouts.push(timeout1);
    }

    destroy() {
        this.isDestroyed = true;
        
        // Clear all pending timeouts
        this.animationTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.animationTimeouts = [];
        
        // Remove the loading screen from DOM
        if (this.loadingScreen) {
            // Prefer element.remove() over parentNode.removeChild(element)
            this.loadingScreen.remove();
        }
    }

    error() {
        if (this.isDestroyed) return;
        
        this.progressNumber.textContent = 'ERR';
        this.progressNumber.style.color = '#ff4444';
        this.progressNumber.style.textShadow = 
            '0 0 5px #ff4444, 0 0 10px #ff4444, 0 0 15px rgba(255, 68, 68, 0.5)';
        this.progressBar.style.display = 'none';
        
        const errorMsg = document.createElement('div');
        errorMsg.textContent = 'LOADING FAILED - RELOAD REQUIRED';
        errorMsg.style.cssText = `
            color: #ff4444;
            font-family: 'Share Tech Mono', monospace;
            font-size: 16px;
            margin-top: 20px;
            text-align: center;
            text-shadow: 0 0 5px #ff4444;
        `;
        this.loadingScreen.querySelector('.progress-container').appendChild(errorMsg);
    }
}