"use client"
import { useAuth } from '@/AuthContext'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]

type SignalMessage =
  | { type: 'join-call'; userId: number; from: number }
  | { type: 'new-peer'; peerId: number; from: number }
  | { type: 'peer-list'; peers: number[]; from: number }
  | { type: 'offer'; sdp: string; target: number; from: number }
  | { type: 'answer'; sdp: string; target: number; from: number }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; target: number; from: number }
  | { type: 'peer-disconnected'; peerId: number; from: number }
  | { type: 'ping' } // keep-alive from server (ignored/logged)

export default function VoiceChatPage() {
  const { id } = useParams<{ id: string }>()
  const callId = id

  const { user } = useAuth()
  const [logLines, setLogLines] = useState<string[]>(['Initializing voice chat…'])
  const [peers, setPeers] = useState<number[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [mediaGranted, setMediaGranted] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const localStream = useRef<MediaStream | null>(null)
  const pcs = useRef<Record<number, RTCPeerConnection>>({})
  const audios = useRef<Record<number, HTMLAudioElement>>({})
  const ws = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 3
  const offeredTo = useRef<Set<number>>(new Set()) // prevent duplicate offers

  const log = (msg: string) => {
    // console for devtools + UI state
    console.log(`[VoiceChat] ${msg}`)
    setLogLines(prev => [...prev.slice(-100), msg])
  }

  const cleanup = () => {
    log("Cleaning up resources…")

    // close peer connections
    Object.values(pcs.current).forEach(pc => pc.close())
    pcs.current = {}
    offeredTo.current.clear()

    // stop local media
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null

    // remove audio elements
    Object.values(audios.current).forEach(a => a.remove())
    audios.current = {}

    // close ws
    if (ws.current) {
      ws.current.onopen = null
      ws.current.onclose = null
      ws.current.onerror = null
      ws.current.onmessage = null
      try { ws.current.close() } catch {}
      ws.current = null
    }

    setWsConnected(false)
    setMediaGranted(false)
    setPeers([])
    setAutoplayBlocked(false)
  }

  // Clean up on unmount and on refresh/close
  useEffect(() => {
    const onUnload = () => cleanup()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      cleanup()
    }
  }, [])

  // Initialize when we have callId + user
  useEffect(() => {
    if (!user?.id || !callId) {
      log("Missing user or callId; waiting…")
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        await getMediaStream()
        if (cancelled) return
        connectWebSocket()
      } catch (e) {
        log(`Init error: ${e}`)
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, callId])

  // ===== Media =====
  const getMediaStream = async () => {
    try {
      log("Requesting microphone access…")
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      })
      localStream.current = stream
      setMediaGranted(true)
      log("Microphone access granted")

      // local monitor (muted)
      const localAudio = document.createElement('audio')
      localAudio.srcObject = stream
      localAudio.muted = true
      localAudio.controls = true
      document.body.appendChild(localAudio)
    } catch (err) {
      log(`getUserMedia error: ${err}`)
      setMediaGranted(false)
      throw err
    }
  }

  // ===== WebSocket / Signaling =====
  const connectWebSocket = () => {
    if (!user?.id || !callId) return
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      log("WebSocket already connected/connecting")
      return
    }

    const wsUrl = `ws://localhost:8000/ws/signaling/${callId}/${user.id}`
    log(`Connecting WS → ${wsUrl} (attempt ${retryCount.current + 1})`)
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      retryCount.current = 0
      setWsConnected(true)
      log("WebSocket connected")

      const join: SignalMessage = { type: 'join-call', userId: user.id, from: user.id }
      ws.current?.send(JSON.stringify(join))
    }

    ws.current.onclose = () => {
      setWsConnected(false)
      log("WebSocket closed")
      if (retryCount.current < maxRetries) {
        retryCount.current += 1
        const delay = Math.min(5000, 1000 * retryCount.current)
        log(`Reconnecting in ${delay}ms…`)
        setTimeout(connectWebSocket, delay)
      }
    }

    ws.current.onerror = (e) => {
      log(`WebSocket error: ${e}`)
    }

    ws.current.onmessage = handleSignal
  }

  const handleSignal = async (e: MessageEvent) => {
    try {
      const msg = JSON.parse(e.data) as SignalMessage

      // ping keep-alive
      if ((msg as any).type === 'ping') {
        log('Ping')
        return
      }

      // Ignore our own
      if ('from' in msg && msg.from === user?.id) return

      switch (msg.type) {
        case 'new-peer': {
          const { peerId } = msg
          if (peerId !== user?.id && !pcs.current[peerId]) {
            setPeers(prev => (prev.includes(peerId) ? prev : [...prev, peerId]))
            await initiateCall(peerId)
          }
          break
        }
        case 'peer-list': {
          const { peers: list } = msg
          for (const pid of list) {
            if (pid !== user?.id && !pcs.current[pid]) {
              setPeers(prev => (prev.includes(pid) ? prev : [...prev, pid]))
              await initiateCall(pid)
            }
          }
          break
        }
        case 'offer': {
          await handleOffer(msg.from, msg.sdp)
          break
        }
        case 'answer': {
          await handleAnswer(msg.from, msg.sdp)
          break
        }
        case 'ice-candidate': {
          await handleIce(msg.from, msg.candidate)
          break
        }
        case 'peer-disconnected': {
          const { peerId } = msg
          if (pcs.current[peerId]) {
            pcs.current[peerId].close()
            delete pcs.current[peerId]
          }
          if (audios.current[peerId]) {
            audios.current[peerId].remove()
            delete audios.current[peerId]
          }
          setPeers(prev => prev.filter(p => p !== peerId))
          offeredTo.current.delete(peerId)
          log(`Peer ${peerId} disconnected`)
          break
        }
        default:
          log(`Unknown message type: ${(msg as any).type}`)
      }
    } catch (err) {
      log(`Signal handling error: ${err}`)
    }
  }

  const createPeerConnection = (peerId: number): RTCPeerConnection | null => {
    if (peerId === user?.id) return null;
    if (pcs.current[peerId]) return pcs.current[peerId];
    log(`Creating RTCPeerConnection for ${peerId}`);
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    localStream.current?.getTracks().forEach(track => pc.addTrack(track, localStream.current!));
    pc.onicecandidate = (ev) => {
      if (ev.candidate && ws.current?.readyState === WebSocket.OPEN) {
        const msg: SignalMessage = {
          type: 'ice-candidate',
          candidate: ev.candidate.toJSON(),
          target: peerId,
          from: user!.id,
        };
        ws.current.send(JSON.stringify(msg));
        log(`Sent ICE candidate to ${peerId}: ${JSON.stringify(ev.candidate)}`);
      }
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      log(`Received stream from ${peerId}: ${stream.getTracks().map(t => t.kind)}`);
      if (!audios.current[peerId]) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.controls = true;
        audio.volume = 1.0;
        audio.muted = false;
        document.body.appendChild(audio);
        audios.current[peerId] = audio;
      }
      const el = audios.current[peerId];
      el.srcObject = stream;
      el.play().then(() => {
        log(`Remote audio playing from ${peerId}`);
      }).catch(err => {
        setAutoplayBlocked(true);
        log(`Autoplay blocked for ${peerId}: ${err}`);
      });
    };
    pc.oniceconnectionstatechange = () => {
      log(`Peer ${peerId} ICE state: ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      log(`Peer ${peerId} state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        pc.close();
        delete pcs.current[peerId];
        audios.current[peerId]?.remove();
        delete audios.current[peerId];
        setPeers(prev => prev.filter(p => p !== peerId));
        offeredTo.current.delete(peerId);
      }
    };
    pcs.current[peerId] = pc;
    return pc;
  };

  const initiateCall = async (peerId: number) => {
    if (peerId === user?.id) return
    // avoid spamming offers to same peer
    if (offeredTo.current.has(peerId)) {
      log(`Offer already sent to ${peerId}, skipping`)
      return
    }

    const pc = createPeerConnection(peerId)
    if (!pc) return

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      offeredTo.current.add(peerId)

      const msg: SignalMessage = {
        type: 'offer',
        sdp: offer.sdp!,
        target: peerId,
        from: user!.id
      }
      ws.current?.send(JSON.stringify(msg))
      log(`Sent offer to ${peerId}`)
    } catch (err) {
      log(`initiateCall error (${peerId}): ${err}`)
    }
  }

  const handleOffer = async (from: number, sdp: string) => {
    const pc = createPeerConnection(from)
    if (!pc) return

    try {
      await pc.setRemoteDescription({ type: 'offer', sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const msg: SignalMessage = {
        type: 'answer',
        sdp: answer.sdp!,
        target: from,
        from: user!.id
      }
      ws.current?.send(JSON.stringify(msg))
      log(`Answered offer from ${from}`)
    } catch (err) {
      log(`handleOffer error (${from}): ${err}`)
    }
  }

  const handleAnswer = async (from: number, sdp: string) => {
    const pc = pcs.current[from];
    if (!pc) {
      log(`No peer connection for ${from}`);
      return;
    }
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription({ type: 'answer', sdp });
        log(`Set remote answer from ${from}`);
      } else {
        log(`Cannot set answer in state ${pc.signalingState} for ${from}`);
      }
    } catch (err) {
      log(`handleAnswer error (${from}): ${err}`);
    }
  };

  const handleIce = async (from: number, candidate: RTCIceCandidateInit) => {
    const pc = pcs.current[from]
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      log(`addIceCandidate error (${from}): ${err}`)
    }
  }

  // Fallback button if autoplay is blocked (esp. Incognito)
  const enableAudio = () => {
    const attempts = Object.values(audios.current).map(a =>
      a.play().catch(err => log(`Manual play failed: ${err}`))
    )
    Promise.allSettled(attempts).then(() => setAutoplayBlocked(false))
  }

  if (!user) return null

  return (
    <div className="p-4 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Voice Chat</h1>

      <div className="mb-4 p-2 bg-gray-800 rounded font-mono text-sm space-y-1">
        <div><strong>Call:</strong> {callId}</div>
        <div><strong>WebSocket:</strong> {wsConnected ? '✅ Connected' : '❌ Disconnected'}</div>
        <div><strong>Microphone:</strong> {mediaGranted ? '✅ Granted' : '❌ Denied'}</div>
        <div><strong>Active peers:</strong> {peers.length ? peers.join(', ') : 'None'}</div>
      </div>

      {autoplayBlocked && (
        <button
          onClick={enableAudio}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
        >
          Enable audio
        </button>
      )}

      {/* <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono max-h-48 overflow-y-auto">
        <h3 className="font-semibold mb-1">Debug Log:</h3>
        {logLines.slice(-20).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div> */}
    </div>
  )
}
