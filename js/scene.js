// scene.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimulationState } from './state.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        // 1. Setup Three.js Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e17); // Match CSS bg
        this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.02);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 2, 5);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls (Blender-like camera)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 50;
        this.controls.target.set(0, 0, 0);

        // 5. Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x00f2ff, 1, 100);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);

        // 5. Objects
        this.balloonMesh = this.createBalloon();
        this.scene.add(this.balloonMesh);

        this.floorMesh = this.createFloor();
        this.scene.add(this.floorMesh);

        this.particles = null; // For explosion

        // Handle Resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Disable controls when mouse is over UI container
        this.setupControlsLimiting();
    }

    setupControlsLimiting() {
        // Get the single UI container
        const uiContainer = document.getElementById('ui-container');

        if (uiContainer) {
            // Disable controls when mouse enters UI container
            uiContainer.addEventListener('mouseenter', () => {
                this.controls.enabled = false;
            });

            uiContainer.addEventListener('mouseleave', () => {
                this.controls.enabled = true;
            });
        }

        // Ensure controls are enabled when over canvas
        this.renderer.domElement.addEventListener('mouseenter', () => {
            this.controls.enabled = true;
        });
    }

    createBalloon() {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x4a90e2, // Initial Blue
            metalness: 0.1,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 0.9,
            transmission: 0.2 // Glass-like look
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        return mesh;
    }

    createFloor() {
        const geometry = new THREE.GridHelper(200, 50, 0x00f2ff, 0x2a2a2a);
        geometry.position.y = -1.05; // Slightly below balloon start
        return geometry;
    }

    createExplosion(position) {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y, position.z);
            velocities.push(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xff3333,
            size: 0.1,
            transparent: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.userData = { velocities: velocities };
        this.scene.add(this.particles);

        // Hide balloon
        this.balloonMesh.visible = false;
    }

    explode() {
        this.createExplosion(this.balloonMesh.position.clone());
    }

    update(deltaTime) {
        const s = SimulationState;

        if (this.particles) {
            // Update explosion
            const positions = this.particles.geometry.attributes.position.array;
            const velocities = this.particles.userData.velocities;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i] * deltaTime;
                positions[i + 1] += velocities[i + 1] * deltaTime;
                positions[i + 2] += velocities[i + 2] * deltaTime;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.material.opacity -= deltaTime * 0.5;

            if (this.particles.material.opacity <= 0) {
                this.scene.remove(this.particles);
                this.particles = null;
            }
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (!this.balloonMesh.visible) return;

        // 1. Update Balloon Size
        // Scale is proportional to radius. Initial radius is 1.0.
        const scale = s.balloon.radius;
        this.balloonMesh.scale.set(scale, scale, scale);

        // 2. Update Balloon Position
        // In Mission mode, it moves up. In others, it stays at 0 (or we could animate bobbing)
        this.balloonMesh.position.y = s.balloon.positionY;

        // 3. Update Color (Tension)
        // Interpolate from Blue (safe) to Red (danger)
        const tension = Math.min(s.balloon.radius / s.balloon.maxRadius, 1.0);
        const colorSafe = new THREE.Color(0x4a90e2);
        const colorDanger = new THREE.Color(0xff3333);

        this.balloonMesh.material.color.lerpColors(colorSafe, colorDanger, Math.pow(tension, 3)); // Exponential for dramatic effect near end

        // 4. Camera Follow (Mission Mode)
        if (s.mode === 'MISSION' && s.isRunning) {
            // Closely follow balloon during ascent
            const targetY = s.balloon.positionY;

            // Smooth camera target tracking
            this.controls.target.y += (targetY - this.controls.target.y) * 8.0 * deltaTime;

            // Also adjust camera position to maintain close view
            const desiredCameraY = targetY + 2; // Slightly above balloon
            const desiredCameraZ = 5 + s.balloon.radius; // Adjust distance based on size

            this.camera.position.y += (desiredCameraY - this.camera.position.y) * 5.0 * deltaTime;
            this.camera.position.z += (desiredCameraZ - this.camera.position.z) * 3.0 * deltaTime;
        } else {
            // Reset target to origin when not in mission or not running
            this.controls.target.y += (0 - this.controls.target.y) * 3.0 * deltaTime;

            // Reset camera position smoothly
            this.camera.position.y += (2 - this.camera.position.y) * 2.0 * deltaTime;
            this.camera.position.z += (5 - this.camera.position.z) * 2.0 * deltaTime;
        }

        // Update controls
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
    }

    reset() {
        this.balloonMesh.visible = true;
        this.balloonMesh.scale.set(1, 1, 1);
        this.balloonMesh.position.set(0, 0, 0);
        this.balloonMesh.material.color.setHex(0x4a90e2);
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles = null;
        }
        this.camera.position.set(0, 2, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
