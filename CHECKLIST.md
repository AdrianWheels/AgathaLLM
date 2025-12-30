# Checklist de implementación

Checklist para controlar lo implementado y lo pendiente en el sistema.

## Base técnica
- [x] Dependencias instaladas y reproducibles (`npm i`).
- [x] Script de tests configurado y ejecutable (`vitest run`).
- [x] Requisitos mínimos documentados (Node, navegador, WebGPU/WASM).

## Carga de modelos (WebLLM)
- [x] Flujo de carga con estados claros (inicializando, descargando, listo).
- [x] Manejo de errores de red/CSP con mensaje útil.
- [x] Persistencia de modelo seleccionado en `localStorage`.
- [x] Opción de usar modelos locales en `public/models/`.

## Experiencia de interrogatorio
- [x] Explicación visible de niveles L0–L3.
- [x] Resumen de pistas activas por chat.
- [x] Reset de chats funcional y testeado.
- [x] Límite/contador de turnos por sesión.

## Prompts y contenido
- [x] Plantillas de prompt separadas por sospechoso.
- [x] Validaciones para evitar revelaciones fuera del nivel.
- [x] Ejemplos de respuestas esperadas por nivel.

## Observabilidad ligera
- [ ] Medición de latencia por turno.
- [ ] Logging de eventos clave (carga, envío, error).
- [ ] Exportación de sesión a JSON.

## Tests y calidad
- [ ] Tests UI para carga del modelo y errores simulados.
- [x] Tests de interacción de pistas y envío de mensajes.
- [ ] CI ejecuta `npm run test`.

## Performance
- [ ] Evitar renders innecesarios en chats largos.
- [ ] Lazy-load de componentes pesados.
- [ ] Métricas de rendimiento básicas.

## Accesibilidad
- [ ] Contraste y tamaños mínimos de fuente.
- [ ] Navegación por teclado y foco visible.
- [ ] Etiquetas ARIA en controles clave.
