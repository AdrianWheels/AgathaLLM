import React, { useMemo, useState } from 'react'
import { CreateMLCEngine } from '@mlc-ai/web-llm'
import {
  CLUES,
  SUSPECTS,
  buildSystemPrompt,
  computeScoreForSuspect,
  pickMood,
  scoreToLevel
} from './domain/interrogation'

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

const moodEmoji = (m) => ({Pensativo:'🤔', Cabreado:'😠', Nervioso:'😬', Evitativo:'🫥'})[m] || '🫥'
const choose = (arr) => arr[Math.floor(Math.random()*arr.length)]

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

function ChatBox({ suspect, activeClues, pushMessage, messages, engine }){
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const score = useMemo(() => computeScoreForSuspect(activeClues, suspect), [activeClues, suspect])
  const level = useMemo(() => scoreToLevel(score), [score])
  const mood = useMemo(() => pickMood(SUSPECTS[suspect].baselineMood, score, suspect), [score, suspect])

  async function send(){
    const q = input.trim(); if(!q || busy) return
    setBusy(true)
    pushMessage(suspect, { role:'user', text:q, at:Date.now() })

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
    setInput(''); setBusy(false)
  }

  return (
    <div className="card chat">
      <div className="chat-head">
        <div className="avatar" style={{'--c1': SUSPECTS[suspect].c1, '--c2': SUSPECTS[suspect].c2}} />
        <div style={{flex:1}}>
          <div style={{fontWeight:600,color:'#f3f6ff'}}>{SUSPECTS[suspect].name}</div>
          <div className="row small muted"><Badge text={`Nivel ${level}`} /> <span>{moodEmoji(mood)} {mood}</span></div>
        </div>
      </div>
      <div className="row small muted" style={{alignItems:'center', margin:'4px 0'}}>
        <span>Presión</span><ProgressBar value={Math.min(100, score*33)} />
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
        <input placeholder="Escribe tu pregunta…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} disabled={busy} />
        <button onClick={send} disabled={busy}>{busy?'Pensando…':'Enviar'}</button>
      </div>
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

  const supportsWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator

  function toggleClue(id){
    setActiveClues(prev => { const next = new Set(prev); if(next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function pushMessage(id, msg){
    setAllMessages(prev => ({ ...prev, [id]: [...prev[id], msg] }))
  }
  function resetChats(){ setAllMessages({ A:[], B:[], C:[] }) }

  async function loadModel(name){
    setStatus(supportsWebGPU ? 'descargando modelo…' : 'WASM lento, sin WebGPU')
    try{
      const e = await CreateMLCEngine(name, {
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
    for(const sid of Object.keys(SUSPECTS)){
      pushMessage(sid, { role:'user', text:q, at: Date.now() })
    }
    await Promise.all(Object.keys(SUSPECTS).map(async sid => {
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

  return (
    <div className="wrap">
      <h1>Prototipo: 3 Sospechosos + 4 Pistas <span className="muted">(React + Vite + WebLLM)</span></h1>
      <p className="muted small">Pulsa pistas para “presionar”. Carga un modelo pequeño en el navegador. Si no, se usa fallback enlatado.</p>

      <div className="card row" style={{justifyContent:'space-between'}}>
        <div className="row">
          <span className="small">Modelo:</span>
          <select value={modelName} onChange={(e)=>setModelName(e.target.value)}>
            <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama-3.2-1B Instruct (q4) — recomendado</option>
            <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3-mini-4k Instruct (q4)</option>
          </select>
          <button onClick={()=>loadModel(modelName)} disabled={ready}>{ready?'Cargado':'Cargar modelo'}</button>
          {!supportsWebGPU && <span className="tag">Sin WebGPU: irá lento (WASM)</span>}
        </div>
        <div className="status">
          <span className="lab small">{status}</span>
          <div className="bar" style={{width:'240px'}}><i style={{width:`${(progress||0)*100}%`}}/></div>
        </div>
      </div>

      <div className="card row" id="cluesBar">
        {CLUES.map(c => {
          const active = activeClues.has(c.id)
          return <button key={c.id} title={c.desc} onClick={()=>toggleClue(c.id)} className={active?'active':''}>{active?'✓ ':''}{c.label}</button>
        })}
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button onClick={()=>setActiveClues(new Set())}>Limpiar pistas</button>
          <button onClick={resetChats}>Reset chats</button>
        </div>
      </div>

      <div className="row" style={{marginTop:8}}>
        <input placeholder="Pregunta global para los tres sospechosos…" value={broadcast} onChange={e=>setBroadcast(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendBroadcast()} style={{flex:1}} />
        <button onClick={sendBroadcast}>Enviar a todos</button>
      </div>

      <div className="grid grid-3" style={{marginTop:12}}>
        {statusList.map(s => (
          <div key={s.id} className="card">
            <div className="small muted">{SUSPECTS[s.id].name}</div>
            <div className="row small" style={{marginTop:4}}><span className="pill">{`Nivel ${s.level}`}</span><span className="pill">{`score ${s.score}`}</span></div>
          </div>
        ))}
      </div>

      <div className="grid grid-3" style={{marginTop:12}}>
        {Object.keys(SUSPECTS).map(sid => (
          <ChatBox key={sid} suspect={sid} activeClues={activeClues} pushMessage={pushMessage} messages={allMessages[sid]} engine={engine} />
        ))}
      </div>
    </div>
  )
}
