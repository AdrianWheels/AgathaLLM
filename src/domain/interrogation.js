const LEVELS = ['L0', 'L1', 'L2', 'L3']

const SUSPECTS = {
  A: {
    id: 'A',
    name: 'Lucía Varela',
    baselineMood: 'Pensativo',
    c1: '#22d3ee',
    c2: '#3b82f6',
    persona: `Eres Lucía Varela, fotógrafa de 28 años. Tono contenido e irónico. Guardas el secreto de haber forzado la cerradura del despacho a las 21:40 para buscar un borrador del testamento. Jamás reveles el secreto salvo en L3.`
  },
  B: {
    id: 'B',
    name: 'Bruno Cebrián',
    baselineMood: 'Evitativo',
    c1: '#f59e0b',
    c2: '#ea580c',
    persona: `Eres Bruno Cebrián, 42, empresario con deudas. Mientes por defecto, reaccionas mal a la presión. Eres el asesino: entraste con llave maestra a las 21:46 y golpeaste a Ernesto con una escultura. No confieses salvo en L3.`
  },
  C: {
    id: 'C',
    name: 'Marta Saldaña',
    baselineMood: 'Cabreado',
    c1: '#d946ef',
    c2: '#db2777',
    persona: `Eres Marta Saldaña, 35, administras la fundación. Apagaste la cámara del pasillo 21:30–22:10 y quemaste notas comprometedoras. No mataste a tu padre. Defiendes tu reputación con dureza. Secreto solo en L2+.`
  }
}

const CLUES = [
  { id: 'P2', label: 'P2 Cerradura arañada', desc: 'Marca en cerradura del despacho', weights: { A: 1 } },
  { id: 'P4', label: 'P4 Llave maestra + huella', desc: 'Llave del personal con huella parcial', weights: { B: 1 } },
  { id: 'P5', label: 'P5 Escultura abollada', desc: 'Arma con microfibra azul', weights: { B: 2 } },
  { id: 'P7', label: 'P7 Cámara pasillo OFF', desc: 'NVR sin señal 21:30–22:10', weights: { C: 1 } }
]

function computeScoreForSuspect(active, suspect) {
  let score = 0
  for (const c of CLUES) {
    if (active.has(c.id)) score += (c.weights[suspect] || 0)
  }
  return score
}

function scoreToLevel(score) {
  return LEVELS[Math.min(score, 3)]
}

function pickMood(baseline, score, suspect) {
  if (suspect === 'B') {
    if (score >= 2) return 'Cabreado'
    if (score >= 1) return 'Nervioso'
    return baseline
  }
  if (suspect === 'C') {
    if (score >= 1) return 'Pensativo'
    return baseline
  }
  if (score >= 1) return 'Evitativo'
  return baseline
}

function buildSystemPrompt(suspect, truthLevel, activeClues) {
  const s = SUSPECTS[suspect]
  const clueList = CLUES.filter(c => activeClues.has(c.id)).map(c => c.label).join(', ') || '(ninguna)'
  const guide = {
    L0: 'Miente de forma plausible, desvía y acusa con moderación. No inventes pruebas técnicas específicas.',
    L1: 'Admite únicamente hechos probados por el jugador. Mantén el núcleo oculto.',
    L2: 'Reconoce acciones comprometedoras sin confesar homicidio. Corrige contradicciones previas.',
    L3: 'Revela el núcleo de la verdad relacionado con las pruebas presentadas. Puedes rozar confesión.'
  }[truthLevel]
  return `Roleplay estricto. ${s.persona}
Nivel actual: ${truthLevel}.
Guía: ${guide}
Pruebas presentadas: ${clueList}.
Formato: respuesta breve (80–100 palabras), en primera persona, sin inventar pruebas no mencionadas ni revelar secretos no desbloqueados.`
}

export {
  CLUES,
  LEVELS,
  SUSPECTS,
  buildSystemPrompt,
  computeScoreForSuspect,
  pickMood,
  scoreToLevel
}
