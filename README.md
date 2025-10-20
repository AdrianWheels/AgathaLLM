# 3 Sospechosos + 4 Pistas — WebLLM (Vite)

Interrogatorio jugable con 3 personajes, 4 pistas y niveles de verdad L0→L3. Responde con **WebLLM** en el navegador; si no se puede, usa respuestas enlatadas.

## Requisitos
- Node 18+
- Chrome/Edge recientes (mejor con **WebGPU**). Funciona en WASM sin WebGPU pero es más lento.
- Red que permita descargar modelos de Hugging Face vía WebLLM.

## Arranque
```bash
npm i
npm run dev
# abre la URL que te imprime Vite
```
En la UI pulsa **Cargar modelo**. Primer arranque descarga el modelo (200–700 MB) y lo deja cacheado en IndexedDB.

Modelos sugeridos (prebuild MLC):
- `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- `Phi-3-mini-4k-instruct-q4f16_1-MLC`

## Offline opcional
Puedes servir un paquete MLC local en `./public/models/<MODEL_NAME>/` y usar `CreateMLCEngine` con `appConfig`. Esta plantilla usa el catálogo por defecto; para offline, cambia la llamada en `App.jsx` si lo necesitas.

## Notas
- Si ves “Failed to fetch”, tu red/CSP bloquea los dominios que usa WebLLM. Ejecutar en local suele arreglarlo.
- El prompt de sistema mete persona, pistas activas y nivel L0→L3 para forzar revelaciones.
