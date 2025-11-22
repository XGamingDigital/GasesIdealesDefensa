// physics.js
import { SimulationState, GAS_PROPERTIES } from './state.js';

// Constants
const R = 8.314; // Ideal Gas Constant (J/(mol·K))

/**
 * International Standard Atmosphere (ISA) Model (Simplified for Troposphere)
 * @param {number} altitude - Altitude in meters
 * @returns {Object} { pressure, temperature }
 */
export function getAtmosphere(altitude) {
    // Troposphere constants (0-11km)
    const T0 = 293; // Sea level standard temp (modified to 20°C for user friendliness, usually 288.15K)
    const P0 = 101325; // Sea level standard pressure (Pa)
    const L = 0.0065; // Temperature lapse rate (K/m)
    const g = 9.81;
    const M_air = 0.0289644; // Molar mass of dry air (kg/mol)

    // Temperature at altitude
    let temperature = T0 - (L * altitude);

    // Prevent absolute zero or negative physics glitches
    if (temperature < 1) temperature = 1;

    // Pressure at altitude (Barometric formula)
    // P = P0 * (1 - L*h/T0)^(g*M / R*L)
    const exponent = (g * M_air) / (R * L);
    const base = 1 - (L * altitude) / T0;

    // If base is negative (above atmosphere limit in this simple model), clamp pressure
    let pressure = (base > 0) ? P0 * Math.pow(base, exponent) : 0;

    return { pressure, temperature };
}

/**
 * Calculate Volume using Ideal Gas Law: V = (nRT) / P
 */
export function calculateVolume(n, T, P) {
    if (P <= 0) return Infinity; // Space vacuum expansion
    return (n * R * T) / P;
}

/**
 * Calculate Moles based on initial conditions: n = (PV) / (RT)
 */
export function calculateMoles(P, V, T) {
    return (P * V) / (R * T);
}

/**
 * Main Physics Loop
 * @param {number} deltaTime - Time step in seconds
 * @returns {Object} Status of the frame (e.g., { exploded: boolean })
 */
export function simulationLoop(deltaTime) {
    const s = SimulationState;

    // --- 1. ENVIRONMENT UPDATE ---
    if (s.mode === 'MISSION' && s.isRunning) {
        // Update altitude based on velocity
        s.env.altitude += s.balloon.velocity * deltaTime;
        s.balloon.positionY = s.env.altitude;

        // Get new atmospheric conditions
        const envData = getAtmosphere(s.env.altitude);
        s.env.pressure = envData.pressure;
        s.env.temperature = envData.temperature;
    }

    // --- 2. GAS LAWS (Balloon State) ---
    // In MISSION mode, P and T are dictated by atmosphere.
    // In other modes, they are controlled by sliders (handled in main.js or UI logic),
    // so here we just recalculate Volume based on current P, T, and n.

    // Exception: Gay-Lussac (Volume Constant)
    if (s.mode === 'GAY-LUSSAC') {
        // Volume stays constant, internal pressure changes with temperature
        // Keep the constantVolume stored when mode was entered
        // The radius stays the same visually
        // We don't update s.balloon.volume or s.balloon.radius here
    } else {
        // Boyle, Charles, Mission, IDLE -> Volume changes
        s.balloon.volume = calculateVolume(s.balloon.moles, s.env.temperature, s.env.pressure);

        // Recalculate Radius: V = 4/3 * pi * r^3  =>  r = cbrt(3V / 4pi)
        s.balloon.radius = Math.pow((3 * s.balloon.volume) / (4 * Math.PI), 1 / 3);
    }

    // --- 3. FORCES & MOVEMENT (Mission Mode Only) ---
    if (s.mode === 'MISSION' && s.isRunning) {
        const g = s.env.gravity;
        const M_air = 0.0289644; // kg/mol
        const M_gas = GAS_PROPERTIES[s.balloon.gasType].molarMass;

        // Density of outside air: rho = (P * M) / (R * T)
        const rhoAir = (s.env.pressure * M_air) / (R * s.env.temperature);

        // Density of gas inside (assuming equilibrium P and T)
        const rhoGas = (s.env.pressure * M_gas) / (R * s.env.temperature);

        // Buoyancy Force (Archimedes): F_b = rho_air * V * g
        const liftForce = rhoAir * s.balloon.volume * g;

        // Weight Forces:
        // Mass of gas: m_gas = n * M_gas
        const massGas = s.balloon.moles * M_gas;
        const totalMass = s.balloon.massPayload + s.balloon.massBalloon + massGas;
        const gravityForce = totalMass * g;

        // Net Force
        const netForce = liftForce - gravityForce;

        // Drag Force (Simplified): F_d = 0.5 * rho_air * v^2 * Cd * A
        // Drag always opposes motion
        const Cd = 0.47;
        const Area = Math.PI * s.balloon.radius * s.balloon.radius;
        const dragForce = -Math.sign(s.balloon.velocity) * 0.5 * rhoAir * (s.balloon.velocity * s.balloon.velocity) * Cd * Area;

        // Acceleration: F = ma
        const totalForce = netForce + dragForce;
        const acceleration = totalForce / totalMass;

        // Euler Integration
        s.balloon.velocity += acceleration * deltaTime;

        // Floor collision
        if (s.env.altitude < 0) {
            s.env.altitude = 0;
            s.balloon.positionY = 0;
            s.balloon.velocity = 0;
        }
    }

    // --- 4. LIMITS & EXPLOSION ---
    if (s.balloon.radius >= s.balloon.maxRadius) {
        return { exploded: true };
    }

    return { exploded: false };
}
