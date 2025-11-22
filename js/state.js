// state.js

// Configuration for different gases
export const GAS_PROPERTIES = {
    'HE': { name: 'Helio', molarMass: 0.0040026 }, // kg/mol
    'NE': { name: 'Neón', molarMass: 0.0201797 },
    'AR': { name: 'Argón', molarMass: 0.039948 }
};

const initialState = {
    mode: 'IDLE', // 'IDLE', 'BOYLE', 'CHARLES', 'GAY-LUSSAC', 'MISSION'
    isRunning: false,

    // Environmental Parameters
    env: {
        altitude: 0,      // meters
        pressure: 101325, // Pa
        temperature: 293, // Kelvin (20°C)
        gravity: 9.81     // m/s²
    },

    // Balloon Physics State
    balloon: {
        gasType: 'HE',    // 'HE', 'NE', 'AR'
        moles: 0,         // Will be calculated on init
        volume: 0,        // m³
        radius: 1.0,      // m
        maxRadius: 5.0,   // Burst limit
        positionY: 0,     // Visual/Physics position
        velocity: 0,      // m/s (Vertical)
        massPayload: 0.5, // kg (Basket + Equipment) - Reduced for ascent
        massBalloon: 0.2, // kg (Rubber) - Reduced for ascent
        constantVolume: 0 // For Gay-Lussac mode
    },

    // Animation state for educational modes
    animation: {
        active: false,
        startValue: 0,
        targetValue: 0,
        currentValue: 0,
        duration: 10, // seconds
        elapsed: 0,
        parameter: '', // 'pressure' or 'temperature'
        direction: 1 // 1 for increase, -1 for decrease
    }
};

// Simple reactive state using Proxy
const handler = {
    set(target, property, value) {
        target[property] = value;
        // We could add event dispatching here if needed
        return true;
    }
};

export const SimulationState = new Proxy(initialState, handler);

// Helper to reset state for mission
export function resetMissionState() {
    SimulationState.env.altitude = 0;
    SimulationState.env.pressure = 101325;
    SimulationState.env.temperature = 293;
    SimulationState.balloon.positionY = 0;
    SimulationState.balloon.velocity = 0;
    SimulationState.balloon.radius = 1.0;
    SimulationState.isRunning = false;
    SimulationState.animation.active = false;
}
