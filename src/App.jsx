import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CreateMLCEngine } from '@mlc-ai/web-llm'

const LEVELS = ['L0','L1','L2','L3']

const PLACEHOLDER_IMAGE = 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'

const SUSPECTS = {
  A: { id:'A', name:'Lucía Varela', role:'Fotógrafa', vibe:'Observadora', baselineMood:'Pensativo', c1:'#22d3ee', c2:'#3b82f6', image: PLACEHOLDER_IMAGE,
    persona: `Eres Lucía Varela, fotógrafa de 28 años. Tono contenido e irónico. Guardas el secreto de haber forzado la cerradura del despacho a las 21:40 para buscar un borrador del testamento. Jamás reveles el secreto salvo en L3.` },
  B: { id:'B', name:'Bruno Cebrián', role:'Empresario', vibe:'Impetuoso', baselineMood:'Evitativo', c1:'#f59e0b', c2:'#ea580c', image: PLACEHOLDER_IMAGE,
    persona: `Eres Bruno Cebrián, 42, empresario con deudas. Mientes por defecto, reaccionas mal a la presión. Eres el asesino: entraste con llave maestra a las 21:46 y golpeaste a Ernesto con una escultura. No confieses salvo en L3.` },
  C: { id:'C', name:'Marta Saldaña', role:'Administradora', vibe:'Controlada', baselineMood:'Cabreado', c1:'#d946ef', c2:'#db2777', image: PLACEHOLDER_IMAGE,
    persona: `Eres Marta Saldaña, 35, administras la fundación. Apagaste la cámara del pasillo 21:30–22:10 y quemaste notas comprometedoras. No mataste a tu padre. Defiendes tu reputación con dureza. Secreto solo en L2+.` },
}

const CLUES = [
  { id:'P2', label:'P2 Cerradura arañada', desc:'Marca en cerradura del despacho', weights:{ A:1 } },
  { id:'P4', label:'P4 Llave maestra + huella', desc:'Llave del personal con huella parcial', weights:{ B:1 } },
  { id:'P5', label:'P5 Escultura abollada', desc:'Arma con microfibra azul', weights:{ B:2 } },
  { id:'P7', label:'P7 Cámara pasillo OFF', desc:'NVR sin señal 21:30–22:10', weights:{ C:1 } },
]

const CANNED = {
  A: { L0:[
        'Estuve entre la galería y la cocina. Evité el despacho, era una noche tensa.',
        'No me fijé en la puerta. Debió chirriar como siempre, nada más.'
      ],
      L1:[
        'Sí, escuché metal a esa hora y miré el pasillo. Saqué la cámara por reflejo, salió borrosa.',
        'Me interesaban papeles antiguos. Fue imprudente acercarme, lo admito.'
      ],
      L2:[ 'Probé la cerradura. Quería leer un borrador del testamento. Fue un error, no más.' ],
      L3:[ 'Forcé la cerradura para buscar el borrador. No vi a Ernesto dentro. Me fui al oír pasos.' ]
  },
  B: { L0:[ '¿Llave maestra? Ni idea. A esa hora estaba en el patio, fumando.', 'No toqué esa escultura; detesto el polvo del despacho.' ],
      L1:[ 'La llave la vi días antes por facturas. La devolví. Me lavé las manos por el olor a metal.' ],
      L2:[ 'Entré un momento y salí. Me limpié en el lavadero, había barro por todo el patio.' ],
      L3:[ 'Cogí la escultura, él me provocó, se me fue. Fue un impulso. Me asusté y lavé las manos.' ]
  },
  C: { L0:[ 'Las cámaras fallan siempre. Bajé a archivos y seguí con mis actas.' ],
      L1:[ 'Apagué la cámara para hablar en privado. Fue una mala decisión, no un crimen.' ],
      L2:[ 'Quemé notas injustas. No cambia la hora de la muerte ni dónde estaba.' ],
      L3:[ 'Apagué la cámara y destruí papeles, sí. No toqué a mi padre. Puedo explicarlo punto por punto.' ]
  },
}

const TURN_LIMIT = 6
const MODEL_STORAGE_KEY = 'agatha:selectedModel'
const LOCAL_MODEL_STORAGE_KEY = 'agatha:localModelPath'

function computeScoreForSuspect(active, suspect){
  let score = 0
  for(const c of CLUES){ if(active.has(c.id)) score += (c.weights[suspect] || 0) }
  return score
}
function scoreToLevel(score){ return LEVELS[Math.min(score, 3)] }
function pickMood(baseline, score, suspect){
  if(suspect === 'B'){ if(score>=2) return 'Cabreado'; if(score>=1) return 'Nervioso'; return baseline }
  if(suspect === 'C'){ if(score>=1) return 'Pensativo'; return baseline }
  if(score>=1) return 'Evitativo'
  return baseline
}
const moodEmoji = (m) => ({Pensativo:'🤔', Cabreado:'😠', Nervioso:'😬', Evitativo:'🫥'})[m] || '🫥'
const choose = (arr) => arr[Math.floor(Math.random()*arr.length)]

function buildSystemPrompt(suspect, truthLevel, activeClues){
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

async function callLLM(engine, systemPrompt, history, question, opts){
  const messages = [
    { role:'system', content: systemPrompt },
    ...history,
    { role:'user', content: question }
  ]
  const out = await engine.chat.completions.create({
    messages,
    temperature: opts?.temperature ?? 0.6,
    max_tokens: opts?.max_tokens ?? 140,
    stream: false,
  })
  return out?.choices?.[0]?.message?.content?.trim?.() ?? null
}

function Badge({ text }){ return <span className="pill">{text}</span> }
function ProgressBar({ value=0 }){ return <div className="bar"><i style={{width: `${Math.min(100, Math.max(0, value))}%`}} /></div> }

function ChatBox({ suspect, activeClues, pushMessage, messages, engine, turnCount, onUserTurn }){
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [limitHit, setLimitHit] = useState(false)
  const score = useMemo(() => computeScoreForSuspect(activeClues, suspect), [activeClues, suspect])
  const level = useMemo(() => scoreToLevel(score), [score])
  const mood = useMemo(() => pickMood(SUSPECTS[suspect].baselineMood, score, suspect), [score, suspect])
  const activeClueLabels = useMemo(() => {
    return CLUES.filter(c => activeClues.has(c.id)).map(c => c.label)
  }, [activeClues])

  async function send(){
    const q = input.trim(); if(!q || busy) return
    if(turnCount >= TURN_LIMIT){
      setLimitHit(true)
      return
    }
    setBusy(true)
    pushMessage(suspect, { role:'user', text:q, at:Date.now() })
    onUserTurn(suspect)

    const last = messages.slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    const system = buildSystemPrompt(suspect, level, activeClues)

    let text = null
    try{
      if(engine) text = await callLLM(engine, system, last, q, { temperature: 0.65, max_tokens: 140 })
    }catch{}
    if(!text){
      const pool = CANNED[suspect][level]
      const base = choose(pool)
      const echo = q ? ` (${q.slice(0,40)}${q.length>40?'…':''})` : ''
      text = base + echo
    }
    pushMessage(suspect, { role:'suspect', text, mood, truthLevel: level, at: Date.now() })
    setInput(''); setBusy(false); setLimitHit(false)
  }

  const turnLabel = `${turnCount}/${TURN_LIMIT}`
  const turnLimitReached = turnCount >= TURN_LIMIT

  return (
    <div className="card chat">
      <div className="chat-head">
        <img
          className="avatar"
          src={SUSPECTS[suspect].image}
          alt={`Retrato de ${SUSPECTS[suspect].name}`}
          loading="lazy"
        />
        <div style={{flex:1}}>
          <div style={{fontWeight:600,color:'#f3f6ff'}}>{SUSPECTS[suspect].name}</div>
          <div className="micro muted">{SUSPECTS[suspect].role} · {SUSPECTS[suspect].vibe}</div>
          <div className="row small muted"><Badge text={`Nivel ${level}`} /> <span>{moodEmoji(mood)} {mood}</span></div>
        </div>
      </div>
      <div className="row small muted" style={{alignItems:'center', margin:'4px 0'}}>
        <span>Presión</span><ProgressBar value={Math.min(100, score*33)} />
        <span style={{marginLeft:'auto'}}>Turnos {turnLabel}</span>
      </div>
      <div className="row small muted" style={{marginBottom:6}}>
        <span>Pistas</span>
        {activeClueLabels.length ? (
          activeClueLabels.map(label => <Badge key={label} text={label} />)
        ) : (
          <span>Sin pistas</span>
        )}
      </div>
      <div className="msglist">
        {messages.length === 0 && <div className="small muted" style={{fontStyle:'italic'}}>Sin mensajes. Pregunta algo comprometido…</div>}
        {messages.map((m,i)=>(
          <div key={i} className={m.role==='user'?'me':'npc'}>
            <div className="msg">{m.text}</div>
            {m.role==='suspect' && <div className="meta"><span>{moodEmoji(m.mood)} {m.mood}</span><span>Nivel {m.truthLevel}</span></div>}
          </div>
        ))}
      </div>
      <div className="foot">
        <input placeholder="Escribe tu pregunta…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} disabled={busy || turnLimitReached} />
        <button onClick={send} disabled={busy || turnLimitReached}>{busy?'Pensando…':'Enviar'}</button>
      </div>
      {turnLimitReached && (
        <div className="small muted" style={{marginTop:6}}>Turnos agotados. Reinicia para seguir.</div>
      )}
      {limitHit && !turnLimitReached && (
        <div className="small muted" style={{marginTop:6}}>Turno agotado para este sospechoso.</div>
      )}
    </div>
  )
}

export default function App(){
  const [activeClues, setActiveClues] = useState(new Set())
  const [allMessages, setAllMessages] = useState({ A:[], B:[], C:[] })
  const [broadcast, setBroadcast] = useState('')
  const [engine, setEngine] = useState(null)
  const [status, setStatus] = useState('sin cargar')
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [modelName, setModelName] = useState('Llama-3.2-1B-Instruct-q4f16_1-MLC')
  const [localModelPath, setLocalModelPath] = useState('./models/mi-modelo')
  const [turnCounts, setTurnCounts] = useState({ A:0, B:0, C:0 })
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioContextRef = useRef(null)
  const jazzIntervalRef = useRef(null)

  const supportsWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator

  function ensureAudioContext(){
    if(typeof window === 'undefined') return null
    if(!audioContextRef.current){
      const Context = window.AudioContext || window.webkitAudioContext
      if(!Context) return null
      audioContextRef.current = new Context()
    }
    return audioContextRef.current
  }

  function playClick(){
    if(!audioEnabled) return
    const ctx = ensureAudioContext()
    if(!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 1200
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.09)
  }

  function startJazzLoop(){
    const ctx = ensureAudioContext()
    if(!ctx) return
    const chords = [
      [220, 277.18, 329.63],
      [196, 246.94, 293.66],
      [233.08, 293.66, 349.23],
      [174.61, 220, 261.63]
    ]
    let step = 0
    const playChord = () => {
      const now = ctx.currentTime
      const freqs = chords[step % chords.length]
      freqs.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)
        osc.connect(gain).connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 1.7)
      })
      step += 1
    }
    playChord()
    jazzIntervalRef.current = setInterval(playChord, 2000)
  }

  function stopJazzLoop(){
    if(jazzIntervalRef.current){
      clearInterval(jazzIntervalRef.current)
      jazzIntervalRef.current = null
    }
  }

  useEffect(() => {
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY)
    if(savedModel) setModelName(savedModel)
    const savedPath = localStorage.getItem(LOCAL_MODEL_STORAGE_KEY)
    if(savedPath) setLocalModelPath(savedPath)
  }, [])

  useEffect(() => {
    if(audioEnabled){
      startJazzLoop()
    }else{
      stopJazzLoop()
    }
    return () => stopJazzLoop()
  }, [audioEnabled])

  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE_KEY, modelName)
  }, [modelName])

  useEffect(() => {
    localStorage.setItem(LOCAL_MODEL_STORAGE_KEY, localModelPath)
  }, [localModelPath])

  function toggleClue(id){
    setActiveClues(prev => {
      const next = new Set(prev)
      if(next.has(id)){
        next.delete(id)
      }else{
        next.add(id)
        playClick()
      }
      return next
    })
  }
  function pushMessage(id, msg){
    setAllMessages(prev => ({ ...prev, [id]: [...prev[id], msg] }))
  }
  function trackUserTurn(id){
    setTurnCounts(prev => ({ ...prev, [id]: prev[id] + 1 }))
  }
  function resetChats(){
    setAllMessages({ A:[], B:[], C:[] })
    setTurnCounts({ A:0, B:0, C:0 })
  }

  async function loadModel(name){
    const modelToLoad = name === 'local' ? localModelPath.trim() : name
    if(!modelToLoad) return
    setStatus(supportsWebGPU ? 'descargando modelo…' : 'WASM lento, sin WebGPU')
    try{
      const e = await CreateMLCEngine(modelToLoad, {
        initProgressCallback: (p) => {
          setStatus(p?.text || 'cargando…')
          setProgress(p?.progress ? Math.max(0, Math.min(1, p.progress)) : 0)
        }
      })
      setEngine(e); setReady(true); setStatus('listo'); setProgress(1)
    }catch(err){
      console.error(err); setStatus('error al cargar modelo'); setReady(false)
    }
  }

  async function sendBroadcast(){
    const q = broadcast.trim(); if(!q) return
    const eligible = Object.keys(SUSPECTS).filter(sid => turnCounts[sid] < TURN_LIMIT)
    for(const sid of eligible){
      pushMessage(sid, { role:'user', text:q, at: Date.now() })
      trackUserTurn(sid)
    }
    await Promise.all(eligible.map(async sid => {
      const score = computeScoreForSuspect(activeClues, sid)
      const lvl = scoreToLevel(score)
      const mood = pickMood(SUSPECTS[sid].baselineMood, score, sid)
      const last = allMessages[sid].slice(-4).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      const system = buildSystemPrompt(sid, lvl, activeClues)
      let text = null
      try{
        if(engine) text = await callLLM(engine, system, last, q, { temperature: 0.6, max_tokens: 140 })
      }catch{}
      if(!text){
        const pool = CANNED[sid][lvl]; const base = choose(pool)
        const echo = q ? ` (${q.slice(0,40)}${q.length>40?'…':''})` : ''
        text = base + echo
      }
      pushMessage(sid, { role:'suspect', text, mood, truthLevel: lvl, at: Date.now() })
    }))
    setBroadcast('')
  }

  const statusList = useMemo(() => {
    return Object.keys(SUSPECTS).map(sid => {
      const s = computeScoreForSuspect(activeClues, sid)
      const lvl = scoreToLevel(s)
      return { id: sid, score: s, level: lvl }
    })
  }, [activeClues])

  const cameraOffActive = activeClues.has('P7')

  return (
    <div className={`wrap ${cameraOffActive ? 'cam-off' : ''}`}>
      <div className="hero">
        <div>
          <h1>Archivo Bélico<span className="cursor" aria-hidden="true">█</span></h1>
          <p className="hero-sub">Interroga a los tres sospechosos y deja que las pistas tensen la noche.</p>
          <div className="legend small muted">L0 evasivo · L1 admite · L2 reconoce · L3 revela</div>
        </div>
      </div>

      <div className="card row panel" style={{justifyContent:'space-between'}}>
        <div className="row">
          <span className="small muted">Modelo</span>
          <select value={modelName} onChange={(e)=>setModelName(e.target.value)}>
            <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama-3.2-1B Instruct (q4) — recomendado</option>
            <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3-mini-4k Instruct (q4)</option>
            <option value="local">Modelo local (public/models)</option>
          </select>
          {modelName === 'local' && (
            <input
              className="local-model-input"
              placeholder="./models/tu-modelo"
              value={localModelPath}
              onChange={(e)=>setLocalModelPath(e.target.value)}
            />
          )}
          <button onClick={()=>loadModel(modelName)} disabled={ready}>{ready?'Cargado':'Cargar'}</button>
          {!supportsWebGPU && <span className="tag">Sin WebGPU: irá lento (WASM)</span>}
        </div>
        <div className="status">
          <span className="lab small">{status}</span>
          <div className="bar" style={{width:'240px'}}><i style={{width:`${(progress||0)*100}%`}}/></div>
        </div>
      </div>

      <div className="card row dossier" id="cluesBar">
        {CLUES.map(c => {
          const active = activeClues.has(c.id)
          return <button key={c.id} title={c.desc} onClick={()=>toggleClue(c.id)} className={active?'active':''}>{active?'✓ ':''}{c.label}</button>
        })}
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button onClick={()=>setActiveClues(new Set())}>Limpiar pistas</button>
          <button onClick={resetChats}>Reset chats</button>
        </div>
      </div>

      <div className="row broadcast" style={{marginTop:8}}>
        <input placeholder="Pregunta global…" value={broadcast} onChange={e=>setBroadcast(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendBroadcast()} style={{flex:1}} />
        <button onClick={sendBroadcast}>Enviar</button>
        <button className={`audio-toggle ${audioEnabled ? 'on' : 'off'}`} onClick={()=>setAudioEnabled(prev => !prev)}>
          Audio {audioEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid grid-3" style={{marginTop:12}}>
        {statusList.map(s => (
          <div key={s.id} className="card profile">
            <div className="row" style={{gap:10}}>
              <img
                className="avatar large"
                src={SUSPECTS[s.id].image}
                alt={`Retrato de ${SUSPECTS[s.id].name}`}
                loading="lazy"
              />
              <div>
                <div className="small muted">{SUSPECTS[s.id].role}</div>
                <div style={{fontWeight:600}}>{SUSPECTS[s.id].name}</div>
                <div className="micro muted">{SUSPECTS[s.id].vibe}</div>
              </div>
            </div>
            <div className="row small" style={{marginTop:10}}>
              <span className="pill">{`Nivel ${s.level}`}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-3" style={{marginTop:12}}>
        {Object.keys(SUSPECTS).map(sid => (
          <ChatBox
            key={sid}
            suspect={sid}
            activeClues={activeClues}
            pushMessage={pushMessage}
            messages={allMessages[sid]}
            engine={engine}
            turnCount={turnCounts[sid]}
            onUserTurn={trackUserTurn}
          />
        ))}
      </div>
    </div>
  )
}
