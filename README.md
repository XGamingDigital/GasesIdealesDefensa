# 🎈 Simulación de Globo Meteorológico y Leyes de los Gases

## 1. Objetivo del Proyecto
El objetivo principal de este proyecto es crear una simulación interactiva y visualmente atractiva que demuestre los principios físicos que gobiernan el comportamiento de un globo meteorológico en la atmósfera. 

El simulador tiene un doble propósito:
1.  **Educativo**: Permitir a los usuarios experimentar de forma aislada con las leyes fundamentales de los gases (Boyle, Charles, Gay-Lussac) para entender la relación entre Presión, Volumen y Temperatura.
2.  **Simulación de Misión**: Integrar estas leyes en un entorno realista ("Misión Atmosférica") donde el globo asciende a través de las capas de la atmósfera, enfrentando cambios de presión y temperatura según el modelo ISA (International Standard Atmosphere), calculando fuerzas de flotabilidad, gravedad y resistencia aerodinámica en tiempo real.

## 2. Tecnologías Usadas
El proyecto está construido utilizando tecnologías web modernas, sin dependencias de frameworks pesados para la lógica principal, garantizando un rendimiento óptimo y facilidad de comprensión.

*   **HTML5**: Estructura semántica de la aplicación y contenedores de interfaz.
*   **CSS3 (Vanilla)**: Diseño visual estilo "Glassmorphism" (paneles translúcidos), animaciones CSS para interactividad, y diseño responsivo.
*   **JavaScript (ES6+)**: Lógica de control, gestión de estado y cálculos físicos. Uso de Módulos ES6 (`import`/`export`) para una arquitectura limpia.
*   **Three.js**: Biblioteca de gráficos 3D utilizada para renderizar el globo, el entorno y los efectos visuales (como la tensión del material y explosiones) acelerados por hardware (WebGL).

## 3. Funcionalidades y Documentación Técnica

La simulación se rige estrictamente por leyes físicas reales. A continuación se detallan las fórmulas implementadas y su integración en el código.

### 3.1 Leyes de los Gases Ideales
El comportamiento del gas dentro del globo se modela utilizando la **Ley de los Gases Ideales** ($PV = nRT$). La simulación permite aislar variables para demostrar las tres leyes fundamentales:

#### A. Ley de Boyle-Mariotte (Temperatura Constante)
Establece que la presión de un gas es inversamente proporcional a su volumen cuando la temperatura es constante.
*   **Fórmula**: $$P_1 \cdot V_1 = P_2 \cdot V_2$$
*   **Relación**: Si la presión aumenta, el volumen disminuye (y viceversa).
*   **En la Simulación**: Al mover el slider de Presión, verás cómo el globo se expande o contrae para mantener la igualdad.

#### B. Ley de Charles (Presión Constante)
Establece que el volumen de un gas es directamente proporcional a su temperatura absoluta cuando la presión es constante.
*   **Fórmula**: $$\frac{V_1}{T_1} = \frac{V_2}{T_2}$$
*   **Relación**: Si la temperatura aumenta (calientas el gas), el volumen aumenta (el globo se infla).
*   **En la Simulación**: Al aumentar la Temperatura, el globo crece linealmente.

#### C. Ley de Gay-Lussac (Volumen Constante)
Establece que la presión de un gas es directamente proporcional a su temperatura absoluta cuando el volumen es constante.
*   **Fórmula**: $$\frac{P_1}{T_1} = \frac{P_2}{T_2}$$
*   **Relación**: Si la temperatura aumenta en un recipiente rígido, la presión interna aumenta.
*   **En la Simulación**: El tamaño del globo se bloquea. Al subir la temperatura, verás aumentar el valor de "Presión Interna" en los datos, demostrando el aumento de energía cinética de las moléculas.

---

**Implementación en el Código (`physics.js` & `main.js`):**
*   **`calculateVolume(n, T, P)`**: Función central que resuelve $V = (nRT)/P$.
*   **`calculateMoles(P, V, T)`**: Se usa al inicio para determinar la cantidad de gas basada en el radio inicial.
*   **Lógica de Modos**: El archivo `main.js` detecta qué modo está activo y decide qué variable modificar (P, V o T) mientras mantiene las otras constantes según la ley seleccionada.

### 3.2 Modelo Atmosférico (ISA)
En el "Modo Misión", el entorno no es estático. Se utiliza una versión simplificada del **International Standard Atmosphere (ISA)** para la troposfera (0-11km).

**Fórmulas:**
*   **Temperatura**: $T = T_0 - L \cdot h$
    *   $L$: Gradiente térmico ($0.0065 K/m$)
    *   $h$: Altitud
*   **Presión (Fórmula Barométrica)**: 
    $$P = P_0 \cdot \left(1 - \frac{L \cdot h}{T_0}\right)^{\frac{g \cdot M}{R \cdot L}}$$

**Implementación:**
*   **`physics.js` -> `getAtmosphere(altitude)`**: Recibe la altitud actual del globo y devuelve la presión ($P$) y temperatura ($T$) externas correspondientes. Estas actualizan el estado global (`SimulationState.env`) en cada frame.

### 3.3 Física de Vuelo (Dinámica)
El movimiento vertical del globo se calcula aplicando la **Segunda Ley de Newton** ($\sum F = ma$).

**Fuerzas Involucradas:**
1.  **Empuje (Arquímedes)**: $F_b = \rho_{aire} \cdot V_{globo} \cdot g$
    *   $\rho_{aire}$: Densidad del aire externo, calculada como $\rho = \frac{P \cdot M_{aire}}{R \cdot T}$.
2.  **Peso (Gravedad)**: $F_g = (m_{carga} + m_{globo} + m_{gas}) \cdot g$
    *   $m_{gas}$: Masa del gas noble ($n \cdot M_{gas}$).
3.  **Resistencia (Drag)**: $F_d = \frac{1}{2} \cdot \rho_{aire} \cdot v^2 \cdot C_d \cdot A$
    *   $C_d$: Coeficiente de arrastre (0.47 para una esfera).
    *   $A$: Área transversal ($\pi \cdot r^2$).
    *   El signo de $F_d$ siempre es opuesto a la velocidad.

**Implementación:**
*   **`physics.js` -> `simulationLoop()`**: Calcula estas fuerzas en cada paso de tiempo ($dt$), determina la aceleración neta, y actualiza la velocidad y posición (Integración de Euler).

### 3.4 Arquitectura del Código

El proyecto sigue una arquitectura modular para separar responsabilidades:

1.  **`index.html`**: Define la estructura del DOM. Contiene el canvas para Three.js y los paneles de control (UI).
2.  **`style.css`**: Define la estética. Incluye las clases para el efecto "glassmorphism", disposición de grids, y estilos de los controles deslizantes e inputs.
3.  **`state.js`**: **(Store)** Mantiene el "Single Source of Truth" (Fuente Única de Verdad). Exporta el objeto `SimulationState` que contiene todas las variables vivas (presión, altitud, radio, modo actual, etc.).
4.  **`physics.js`**: **(Model)** Contiene toda la lógica matemática y física descrita anteriormente. Es "puro" en el sentido de que calcula valores basados en el estado pero no manipula el DOM ni la escena 3D directamente.
5.  **`scene.js`**: **(View - 3D)** Gestiona todo lo relacionado con Three.js: cámara, luces, mallas (globo, suelo) y renderizado. Lee el `SimulationState` para actualizar el tamaño visual del globo y su color (indicador de tensión).
6.  **`main.js`**: **(Controller)** El punto de entrada.
    *   Inicializa la simulación.
    *   Escucha eventos del DOM (sliders, botones, inputs).
    *   Coordina el bucle de animación principal (`animate()`).
    *   Llama a `physics.js` para actualizar datos y luego a `scene.js` y `updateUI()` para reflejar los cambios visualmente.
