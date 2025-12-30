# Roadmap técnico — siguientes pasos

Este documento describe los siguientes pasos técnicos para evolucionar la app de interrogatorio con WebLLM.

## 1) Estabilizar entorno y dependencias
- **Objetivo:** garantizar instalaciones reproducibles y tests ejecutables.
- **Acciones:**
  - Asegurar que el script `test` apunte a `vitest run` y no haya duplicados en `package.json`.
  - Documentar requisitos mínimos de Node y cómo instalar dependencias (`npm i`).
  - Añadir nota sobre necesidad de WebGPU/WASM y tamaños de modelo.

## 2) Flujo de carga de modelos
- **Objetivo:** mejorar UX y resiliencia en la descarga/carga del modelo.
- **Acciones:**
  - Mostrar progreso real de descarga (si la API lo expone) o estados intermedios.
  - Manejar errores de red/CSP con mensajes claros y recomendaciones.
  - Persistir selección del modelo en `localStorage` para reutilización.

## 3) Experiencia de interrogatorio
- **Objetivo:** guiar al usuario y hacer visibles las reglas del juego (L0–L3).
- **Acciones:**
  - Añadir ayuda contextual sobre niveles de verdad y pistas activas.
  - Incluir un resumen de pistas seleccionadas en cada chat.
  - Añadir contador de turnos o límite suave por interrogatorio.

## 4) Contenido y prompts
- **Objetivo:** mejorar coherencia narrativa y control de revelaciones.
- **Acciones:**
  - Refinar el prompt de sistema con ejemplos de respuestas esperadas.
  - Separar plantillas de prompt por sospechoso en módulos dedicados.
  - Añadir validaciones para evitar que el LLM revele pistas fuera de nivel.

## 5) Observabilidad ligera
- **Objetivo:** entender fallos y latencias sin backend.
- **Acciones:**
  - Añadir medición de tiempo de respuesta por turno.
  - Log estructurado en consola con eventos clave (carga, envío, error).
  - Opción para exportar un log de sesión a JSON.

## 6) Tests y calidad
- **Objetivo:** proteger el flujo principal de UI.
- **Acciones:**
  - Añadir tests para estados de carga del modelo y errores simulados.
  - Añadir test de UI para activar/desactivar pistas y reset de chats.
  - Integrar `npm run test` en CI si existe pipeline.

## 7) Optimización de performance
- **Objetivo:** reducir bloqueos de UI en máquinas lentas.
- **Acciones:**
  - Debounce de inputs y evitar renders innecesarios.
  - Revisar tamaño de bundle y lazy-load de componentes pesados.
  - Medir FPS y tiempos de render en escenarios con chats largos.

## 8) Opciones offline
- **Objetivo:** facilitar uso sin red.
- **Acciones:**
  - Documentar cómo servir modelos locales en `public/models/`.
  - Añadir selector de fuente de modelo (catálogo vs local).
  - Mostrar estado de cache en IndexedDB.

## 9) Accesibilidad y UI
- **Objetivo:** garantizar uso inclusivo y legibilidad.
- **Acciones:**
  - Revisar contrastes y tamaños mínimos de fuente.
  - Asegurar foco visible y navegación por teclado.
  - Añadir etiquetas ARIA donde falten.

---

**Notas**
- Este roadmap es incremental y puede priorizarse según feedback y disponibilidad de modelos.
