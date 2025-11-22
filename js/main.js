// main.js
import { SimulationState, resetMissionState } from './state.js';
import { simulationLoop, calculateMoles } from './physics.js';
import { SceneManager } from './scene.js';

// --- Initialization ---
const sceneManager = new SceneManager('canvas-container');
let lastTime = performance.now();

// --- UI Elements ---
const ui = {
    modeBtns: document.querySelectorAll('.mode-btn'),
    gasSelect: document.getElementById('gas-select'),

    // Controls - Sliders
    sliderPressure: document.getElementById('slider-pressure'),
    inputPressure: document.getElementById('input-pressure'),
    ctrlPressure: document.getElementById('ctrl-pressure'),
    ctrlPressureFixed: document.getElementById('ctrl-pressure-fixed'),
    valPressureFixed: document.getElementById('val-pressure-fixed'),

    sliderTemp: document.getElementById('slider-temperature'),
    inputTemp: document.getElementById('input-temperature'),
    ctrlTemp: document.getElementById('ctrl-temperature'),
    ctrlTempFixed: document.getElementById('ctrl-temperature-fixed'),
    valTempFixed: document.getElementById('val-temperature-fixed'),

    ctrlVolumeFixed: document.getElementById('ctrl-volume-fixed'),
    valVolumeFixed: document.getElementById('val-volume-fixed'),

    educationalControls: document.getElementById('educational-controls'),
    btnIncrease: document.getElementById('btn-increase'),
    btnDecrease: document.getElementById('btn-decrease'),
    btnStartEdu: document.getElementById('btn-start-edu'),
    btnStopEdu: document.getElementById('btn-stop-edu'),

    missionControls: document.getElementById('mission-controls'),
    btnLaunch: document.getElementById('btn-launch'),
    btnReset: document.getElementById('btn-reset'),

    sliderMaxRadius: document.getElementById('slider-max-radius'),
    inputMaxRadius: document.getElementById('input-max-radius'),

    // Physical Properties
    sliderInitialRadius: document.getElementById('slider-initial-radius'),
    inputInitialRadius: document.getElementById('input-initial-radius'),
    sliderPayloadMass: document.getElementById('slider-payload-mass'),
    inputPayloadMass: document.getElementById('input-payload-mass'),

    // Displays
    dispAlt: document.getElementById('disp-altitude'),
    dispVol: document.getElementById('disp-volume'),
    dispRad: document.getElementById('disp-radius'),
    dispVel: document.getElementById('disp-velocity'),
    dangerBar: document.getElementById('danger-bar'),
    formulaDisplay: document.getElementById('formula-display'),

    status: document.getElementById('connection-status')
};

// --- Helper Functions ---

function recalculateMoles() {
    // Calculate moles based on current initial radius setting at standard conditions (or current P/T)
    // We use standard conditions (1 atm, 20°C) as the "filling" state reference
    const initialRadius = parseFloat(ui.sliderInitialRadius.value);
    const initialVolume = (4 / 3) * Math.PI * Math.pow(initialRadius, 3);
    // Using standard pressure/temp for the "filling station" reference point
    // Or we could use the current slider values if we assume we fill it *now*
    // Let's stick to the current slider values to be more intuitive: "Fill it HERE and NOW"
    const P = parseFloat(ui.sliderPressure.value);
    const T = parseFloat(ui.sliderTemp.value);

    SimulationState.balloon.moles = calculateMoles(P, initialVolume, T);
    SimulationState.balloon.volume = initialVolume;
    SimulationState.balloon.radius = initialRadius;
}

function initSimulation() {
    recalculateMoles();
    console.log(`Simulation Initialized. Moles: ${SimulationState.balloon.moles.toFixed(2)}`);
}

function updateControlVisibility() {
    const mode = SimulationState.mode;

    // Hide all first
    ui.ctrlPressure.classList.add('hidden');
    ui.ctrlPressureFixed.classList.add('hidden');
    ui.ctrlTemp.classList.add('hidden');
    ui.ctrlTempFixed.classList.add('hidden');
    ui.ctrlVolumeFixed.classList.add('hidden');
    ui.educationalControls.classList.add('hidden');
    ui.missionControls.classList.add('hidden');

    // Show appropriate controls based on mode
    if (mode === 'IDLE') {
        // Free mode - show both sliders
        ui.ctrlPressure.classList.remove('hidden');
        ui.ctrlTemp.classList.remove('hidden');
    } else if (mode === 'BOYLE') {
        // Boyle: Pressure varies, Temperature constant
        ui.ctrlPressure.classList.remove('hidden');
        ui.ctrlTempFixed.classList.remove('hidden');
        ui.educationalControls.classList.remove('hidden');
        ui.valTempFixed.textContent = `${SimulationState.env.temperature.toFixed(0)} K`;
    } else if (mode === 'CHARLES') {
        // Charles: Temperature varies, Pressure constant
        ui.ctrlTemp.classList.remove('hidden');
        ui.ctrlPressureFixed.classList.remove('hidden');
        ui.educationalControls.classList.remove('hidden');
        ui.valPressureFixed.textContent = `${SimulationState.env.pressure.toFixed(0)} Pa`;
    } else if (mode === 'GAY-LUSSAC') {
        // Gay-Lussac: Temperature varies, Volume constant
        ui.ctrlTemp.classList.remove('hidden');
        ui.ctrlVolumeFixed.classList.remove('hidden');
        ui.educationalControls.classList.remove('hidden');
        SimulationState.balloon.constantVolume = SimulationState.balloon.volume;
        ui.valVolumeFixed.textContent = `${SimulationState.balloon.volume.toFixed(2)} m³`;
    } else if (mode === 'MISSION') {
        // Mission: Show mission controls
        ui.missionControls.classList.remove('hidden');
    }
}

function updateUI() {
    const s = SimulationState;
    ui.dispAlt.textContent = s.env.altitude.toFixed(0);
    ui.dispVol.textContent = s.balloon.volume.toFixed(2);
    ui.dispRad.textContent = s.balloon.radius.toFixed(2);
    ui.dispVel.textContent = s.balloon.velocity.toFixed(2);

    // Update sliders and inputs (if not in animation)
    if (!s.animation.active) {
        ui.sliderPressure.value = s.env.pressure;
        ui.inputPressure.value = s.env.pressure.toFixed(0);
        ui.sliderTemp.value = s.env.temperature;
        ui.inputTemp.value = s.env.temperature.toFixed(0);
    }

    // Update formula display
    updateFormulaDisplay();

    // Danger meter
    const tension = Math.min(s.balloon.radius / s.balloon.maxRadius, 1.0);
    ui.dangerBar.style.width = `${tension * 100}%`;
}

function updateFormulaDisplay() {
    const s = SimulationState;
    const R = 8.314;
    let formulaHTML = '';

    if (s.mode === 'IDLE') {
        // PV = nRT
        const left = (s.env.pressure * s.balloon.volume).toFixed(0);
        const right = (s.balloon.moles * R * s.env.temperature).toFixed(0);
        formulaHTML = `PV = nRT → <span class="highlight">${s.env.pressure.toFixed(0)}</span> × <span class="highlight">${s.balloon.volume.toFixed(2)}</span> = <span class="highlight">${s.balloon.moles.toFixed(3)}</span> × ${R} × <span class="highlight">${s.env.temperature.toFixed(0)}</span> → ${left} ≈ ${right}`;
    } else if (s.mode === 'BOYLE') {
        // P₁V₁ = P₂V₂ (T constante)
        const product = (s.env.pressure * s.balloon.volume).toFixed(0);
        formulaHTML = `P₁V₁ = P₂V₂ (T=${s.env.temperature.toFixed(0)}K) → <span class="highlight">${s.env.pressure.toFixed(0)}</span> × <span class="highlight">${s.balloon.volume.toFixed(2)}</span> = <span class="highlight">${product}</span>`;
    } else if (s.mode === 'CHARLES') {
        // V₁/T₁ = V₂/T₂ (P constante)
        const ratio = (s.balloon.volume / s.env.temperature).toFixed(5);
        formulaHTML = `V₁/T₁ = V₂/T₂ (P=${s.env.pressure.toFixed(0)}Pa) → <span class="highlight">${s.balloon.volume.toFixed(2)}</span> / <span class="highlight">${s.env.temperature.toFixed(0)}</span> = <span class="highlight">${ratio}</span>`;
    } else if (s.mode === 'GAY-LUSSAC') {
        // P₁/T₁ = P₂/T₂ (V constante)
        const ratio = (s.env.pressure / s.env.temperature).toFixed(2);
        formulaHTML = `P₁/T₁ = P₂/T₂ (V=${s.balloon.constantVolume.toFixed(2)}m³) → <span class="highlight">${s.env.pressure.toFixed(0)}</span> / <span class="highlight">${s.env.temperature.toFixed(0)}</span> = <span class="highlight">${ratio}</span>`;
    } else if (s.mode === 'MISSION') {
        // PV = nRT (Física en acción)
        const left = (s.env.pressure * s.balloon.volume).toFixed(0);
        const right = (s.balloon.moles * R * s.env.temperature).toFixed(0);
        formulaHTML = `PV = nRT → <span class="highlight">${s.env.pressure.toFixed(0)}</span> × <span class="highlight">${s.balloon.volume.toFixed(2)}</span> = ${s.balloon.moles.toFixed(3)} × ${R} × <span class="highlight">${s.env.temperature.toFixed(0)}</span> → ${left} ≈ ${right}`;
    }

    ui.formulaDisplay.innerHTML = `<span class="formula-text">${formulaHTML}</span>`;
}

// --- Event Listeners ---

// Gas selection
ui.gasSelect.addEventListener('change', (e) => {
    SimulationState.balloon.gasType = e.target.value;
});

// === PRESSURE CONTROL - Bidirectional Sync with Validation ===
ui.sliderPressure.addEventListener('input', (e) => {
    if (SimulationState.mode === 'IDLE' || SimulationState.mode === 'BOYLE') {
        const value = parseFloat(e.target.value);
        SimulationState.env.pressure = value;
        ui.inputPressure.value = value.toFixed(0);
    }
});

ui.inputPressure.addEventListener('input', (e) => {
    if (SimulationState.mode === 'IDLE' || SimulationState.mode === 'BOYLE') {
        let value = parseFloat(e.target.value);

        // Validate and clamp
        const min = parseFloat(ui.sliderPressure.min);
        const max = parseFloat(ui.sliderPressure.max);

        if (isNaN(value)) return;
        value = Math.max(min, Math.min(max, value));

        SimulationState.env.pressure = value;
        ui.sliderPressure.value = value;
    }
});

ui.inputPressure.addEventListener('blur', (e) => {
    // On blur, ensure value is valid and formatted
    let value = parseFloat(e.target.value);
    const min = parseFloat(ui.sliderPressure.min);
    const max = parseFloat(ui.sliderPressure.max);

    if (isNaN(value)) {
        value = SimulationState.env.pressure;
    } else {
        value = Math.max(min, Math.min(max, value));
    }

    ui.inputPressure.value = value.toFixed(0);
    SimulationState.env.pressure = value;
    ui.sliderPressure.value = value;
});

// === TEMPERATURE CONTROL - Bidirectional Sync with Validation ===
ui.sliderTemp.addEventListener('input', (e) => {
    if (SimulationState.mode === 'IDLE' || SimulationState.mode === 'CHARLES' || SimulationState.mode === 'GAY-LUSSAC') {
        const value = parseFloat(e.target.value);
        SimulationState.env.temperature = value;
        ui.inputTemp.value = value.toFixed(0);
    }
});

ui.inputTemp.addEventListener('input', (e) => {
    if (SimulationState.mode === 'IDLE' || SimulationState.mode === 'CHARLES' || SimulationState.mode === 'GAY-LUSSAC') {
        let value = parseFloat(e.target.value);

        // Validate and clamp
        const min = parseFloat(ui.sliderTemp.min);
        const max = parseFloat(ui.sliderTemp.max);

        if (isNaN(value)) return;
        value = Math.max(min, Math.min(max, value));

        SimulationState.env.temperature = value;
        ui.sliderTemp.value = value;
    }
});

ui.inputTemp.addEventListener('blur', (e) => {
    // On blur, ensure value is valid and formatted
    let value = parseFloat(e.target.value);
    const min = parseFloat(ui.sliderTemp.min);
    const max = parseFloat(ui.sliderTemp.max);

    if (isNaN(value)) {
        value = SimulationState.env.temperature;
    } else {
        value = Math.max(min, Math.min(max, value));
    }

    ui.inputTemp.value = value.toFixed(0);
    SimulationState.env.temperature = value;
    ui.sliderTemp.value = value;
});

// === MAX RADIUS CONTROL - Bidirectional Sync with Validation ===
ui.sliderMaxRadius.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    SimulationState.balloon.maxRadius = value;
    ui.inputMaxRadius.value = value.toFixed(1);
});

ui.inputMaxRadius.addEventListener('input', (e) => {
    let value = parseFloat(e.target.value);

    // Validate and clamp
    const min = parseFloat(ui.sliderMaxRadius.min);
    const max = parseFloat(ui.sliderMaxRadius.max);

    if (isNaN(value)) return;
    value = Math.max(min, Math.min(max, value));

    SimulationState.balloon.maxRadius = value;
    ui.sliderMaxRadius.value = value;
});

ui.inputMaxRadius.addEventListener('blur', (e) => {
    // On blur, ensure value is valid and formatted
    let value = parseFloat(e.target.value);
    const min = parseFloat(ui.sliderMaxRadius.min);
    const max = parseFloat(ui.sliderMaxRadius.max);

    if (isNaN(value)) {
        value = SimulationState.balloon.maxRadius;
    } else {
        value = Math.max(min, Math.min(max, value));
    }

    ui.inputMaxRadius.value = value.toFixed(1);
    SimulationState.balloon.maxRadius = value;
    ui.sliderMaxRadius.value = value;
});

// === INITIAL RADIUS CONTROL - Bidirectional Sync with Validation ===
ui.sliderInitialRadius.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    ui.inputInitialRadius.value = value.toFixed(1);
    // Recalculate everything since this changes the fundamental amount of gas
    recalculateMoles();
});

ui.inputInitialRadius.addEventListener('input', (e) => {
    let value = parseFloat(e.target.value);

    // Validate and clamp
    const min = parseFloat(ui.sliderInitialRadius.min);
    const max = parseFloat(ui.sliderInitialRadius.max);

    if (isNaN(value)) return;
    value = Math.max(min, Math.min(max, value));

    ui.sliderInitialRadius.value = value;
    recalculateMoles();
});

ui.inputInitialRadius.addEventListener('blur', (e) => {
    let value = parseFloat(e.target.value);
    const min = parseFloat(ui.sliderInitialRadius.min);
    const max = parseFloat(ui.sliderInitialRadius.max);

    if (isNaN(value)) {
        value = parseFloat(ui.sliderInitialRadius.value);
    } else {
        value = Math.max(min, Math.min(max, value));
    }

    ui.inputInitialRadius.value = value.toFixed(1);
    ui.sliderInitialRadius.value = value;
    recalculateMoles();
});

// === PAYLOAD MASS CONTROL - Bidirectional Sync with Validation ===
ui.sliderPayloadMass.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    SimulationState.balloon.massPayload = value;
    ui.inputPayloadMass.value = value.toFixed(1);
});

ui.inputPayloadMass.addEventListener('input', (e) => {
    let value = parseFloat(e.target.value);

    // Validate and clamp
    const min = parseFloat(ui.sliderPayloadMass.min);
    const max = parseFloat(ui.sliderPayloadMass.max);

    if (isNaN(value)) return;
    value = Math.max(min, Math.min(max, value));

    SimulationState.balloon.massPayload = value;
    ui.sliderPayloadMass.value = value;
});

ui.inputPayloadMass.addEventListener('blur', (e) => {
    let value = parseFloat(e.target.value);
    const min = parseFloat(ui.sliderPayloadMass.min);
    const max = parseFloat(ui.sliderPayloadMass.max);

    if (isNaN(value)) {
        value = SimulationState.balloon.massPayload;
    } else {
        value = Math.max(min, Math.min(max, value));
    }

    ui.inputPayloadMass.value = value.toFixed(1);
    SimulationState.balloon.massPayload = value;
    ui.sliderPayloadMass.value = value;
});

// Mode switching
ui.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Visual feedback
        ui.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const newMode = btn.dataset.mode;
        SimulationState.mode = newMode;
        SimulationState.isRunning = false;
        SimulationState.animation.active = false;

        // Reset specific things
        if (newMode === 'MISSION') {
            resetMissionState();
            sceneManager.reset();
            initSimulation();
        } else {
            SimulationState.env.altitude = 0;
            SimulationState.balloon.velocity = 0;
            SimulationState.balloon.positionY = 0;
            sceneManager.reset();
        }

        updateControlVisibility();
    });
});

// Direction button selection (for educational modes)
let selectedDirection = 1; // Default: increase

ui.btnIncrease.addEventListener('click', () => {
    selectedDirection = 1;
    ui.btnIncrease.classList.add('active');
    ui.btnDecrease.classList.remove('active');
    console.log("Dirección seleccionada: AUMENTAR");
});

ui.btnDecrease.addEventListener('click', () => {
    selectedDirection = -1;
    ui.btnDecrease.classList.add('active');
    ui.btnIncrease.classList.remove('active');
    console.log("Dirección seleccionada: DISMINUIR");
});

// Set default selection
ui.btnIncrease.classList.add('active');

// Educational mode simulation (Boyle, Charles, Gay-Lussac)
ui.btnStartEdu.addEventListener('click', () => {
    const mode = SimulationState.mode;
    const s = SimulationState;

    // Define limits
    const PRESSURE_MIN = 10000;
    const PRESSURE_MAX = 200000;
    const TEMP_MIN = 100;
    const TEMP_MAX = 500;

    console.log(`Iniciando simulación en modo ${mode} con dirección: ${selectedDirection === 1 ? 'AUMENTAR' : 'DISMINUIR'}`);

    if (mode === 'BOYLE') {
        // Animate pressure based on selected direction
        s.animation.parameter = 'pressure';
        s.animation.startValue = s.env.pressure;
        s.animation.direction = selectedDirection;

        if (selectedDirection === 1) {
            s.animation.targetValue = PRESSURE_MAX;
            console.log(`Presión: ${s.env.pressure.toFixed(0)} → ${PRESSURE_MAX}`);
        } else {
            s.animation.targetValue = PRESSURE_MIN;
            console.log(`Presión: ${s.env.pressure.toFixed(0)} → ${PRESSURE_MIN}`);
        }

        s.animation.currentValue = s.animation.startValue;
        s.animation.elapsed = 0;
        s.animation.active = true;
    } else if (mode === 'CHARLES') {
        // Animate temperature based on selected direction
        s.animation.parameter = 'temperature';
        s.animation.startValue = s.env.temperature;
        s.animation.direction = selectedDirection;

        if (selectedDirection === 1) {
            s.animation.targetValue = TEMP_MAX;
            console.log(`Temperatura: ${s.env.temperature.toFixed(0)} → ${TEMP_MAX}`);
        } else {
            s.animation.targetValue = TEMP_MIN;
            console.log(`Temperatura: ${s.env.temperature.toFixed(0)} → ${TEMP_MIN}`);
        }

        s.animation.currentValue = s.animation.startValue;
        s.animation.elapsed = 0;
        s.animation.active = true;
    } else if (mode === 'GAY-LUSSAC') {
        // Animate temperature based on selected direction (volume stays constant)
        s.animation.parameter = 'temperature';
        s.animation.startValue = s.env.temperature;
        s.animation.direction = selectedDirection;

        if (selectedDirection === 1) {
            s.animation.targetValue = TEMP_MAX;
            console.log(`Temperatura: ${s.env.temperature.toFixed(0)} → ${TEMP_MAX} (Volumen constante)`);
        } else {
            s.animation.targetValue = TEMP_MIN;
            console.log(`Temperatura: ${s.env.temperature.toFixed(0)} → ${TEMP_MIN} (Volumen constante)`);
        }

        s.animation.currentValue = s.animation.startValue;
        s.animation.elapsed = 0;
        s.animation.active = true;
    }
});

ui.btnStopEdu.addEventListener('click', () => {
    SimulationState.animation.active = false;
    SimulationState.animation.elapsed = 0;
});

// Mission mode controls
ui.btnLaunch.addEventListener('click', () => {
    SimulationState.isRunning = true;
});

ui.btnReset.addEventListener('click', () => {
    resetMissionState();
    sceneManager.reset();
    initSimulation();
});

// --- Main Animation Loop ---
function animate(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap dt
    lastTime = currentTime;

    const s = SimulationState;

    // Handle educational mode animations
    if (s.animation.active) {
        s.animation.elapsed += deltaTime;
        const progress = Math.min(s.animation.elapsed / s.animation.duration, 1.0);

        // Interpolate value
        const value = s.animation.startValue + (s.animation.targetValue - s.animation.startValue) * progress;

        if (s.animation.parameter === 'pressure') {
            s.env.pressure = value;
        } else if (s.animation.parameter === 'temperature') {
            s.env.temperature = value;

            // FIX: For Gay-Lussac, if T changes, P must change to keep V constant
            if (s.mode === 'GAY-LUSSAC') {
                // P = (nRT) / V
                s.env.pressure = (s.balloon.moles * 8.314 * s.env.temperature) / s.balloon.constantVolume;
            }
        }

        // Stop when complete or limit reached
        if (progress >= 1.0) {
            // Snap to target value
            if (s.animation.parameter === 'pressure') {
                s.env.pressure = s.animation.targetValue;
            } else if (s.animation.parameter === 'temperature') {
                s.env.temperature = s.animation.targetValue;

                // Final snap for Gay-Lussac pressure
                if (s.mode === 'GAY-LUSSAC') {
                    s.env.pressure = (s.balloon.moles * 8.314 * s.env.temperature) / s.balloon.constantVolume;
                }
            }
            s.animation.active = false;
            console.log(`Animación completada. Valor final: ${s.animation.targetValue.toFixed(0)}`);
        }
    }

    // Run physics
    const result = simulationLoop(deltaTime);

    // Check for explosion
    if (result.exploded) {
        sceneManager.explode();
        SimulationState.isRunning = false;
        SimulationState.animation.active = false;

        console.log("¡EXPLOSIÓN! Resetando en 3 segundos...");

        setTimeout(() => {
            // Reset scene visual
            sceneManager.reset();

            // Reset state
            if (s.mode === 'MISSION') {
                resetMissionState();
                initSimulation();
            } else {
                // Reset educational modes
                SimulationState.env.altitude = 0;
                SimulationState.balloon.velocity = 0;
                SimulationState.balloon.positionY = 0;
                SimulationState.balloon.radius = 1.0;
                initSimulation();
            }

            console.log("Simulación reiniciada");
        }, 3000);
    }

    // Update UI and scene
    updateUI();
    sceneManager.update(deltaTime);

    requestAnimationFrame(animate);
}

// --- Start Application ---
initSimulation();
updateControlVisibility();
ui.status.style.color = '#00ff00';
ui.status.textContent = '● ONLINE';
requestAnimationFrame(animate);
