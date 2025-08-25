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
  | { type: 'ping' }

export default function VideoChatPage() {
  const { id } = useParams<{ id: string }>()
  const callId = id
  const { user } = useAuth()
  const [logLines, setLogLines] = useState<string[]>(['Initializing video chat…'])
  const [peers, setPeers] = useState<number[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [mediaGranted, setMediaGranted] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const localStream = useRef<MediaStream | null>(null)
  const pcs = useRef<Record<number, RTCPeerConnection>>({})
  const audios = useRef<Record<number, HTMLAudioElement>>({})
  const videos = useRef<Record<number, HTMLVideoElement>>({})
  const ws = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 3
  const offeredTo = useRef<Set<number>>(new Set())

  const log = (msg: string) => {
    console.log(`[VideoChat] ${msg}`)
    setLogLines(prev => [...prev.slice(-100), msg])
  }

  const cleanup = () => {
    log("Cleaning up resources…")
    Object.values(pcs.current).forEach(pc => pc.close())
    pcs.current = {}
    offeredTo.current.clear()
    localStream.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    localStream.current = null
    Object.values(audios.current).forEach(a => a.remove())
    audios.current = {}
    Object.values(videos.current).forEach(v => v.remove())
    videos.current = {}
    if (ws.current) {
      ws.current.onopen = null
      ws.current.onclose = null
      ws.current.onerror = null
      ws.current.onmessage = null
      try { ws.current.close(1000, "Normal closure") } catch {}
      ws.current = null
    }
    setWsConnected(false)
    setMediaGranted(false)
    setPeers([])
    setAutoplayBlocked(false)
    setVideoEnabled(true)
    setCameraAvailable(true)
    retryCount.current = 0
  }

  useEffect(() => {
    const onUnload = () => cleanup()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!user?.id || !callId) {
      log(`Missing user or callId; user=${JSON.stringify(user)}, callId=${callId}`)
      console.log("User:", user, "callId:", callId)
      return
    }
    let cancelled = false
    const init = async () => {
      try {
        await getMediaStream()
        if (cancelled) return
        connectWebSocket()
      } catch (e: unknown) {
        log(`Init error: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    init()
    return () => { cancelled = true }
  }, [user?.id, callId])

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasCamera = devices.some((device: MediaDeviceInfo) => device.kind === 'videoinput')
      setCameraAvailable(hasCamera)
      log(hasCamera ? "Camera detected" : "No camera detected")
      return hasCamera
    } catch (err: unknown) {
      log(`Error checking devices: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }

  const getMediaStream = async () => {
    try {
      log("Requesting media access…")
      const hasCamera = await checkCameraAvailability()
      let stream: MediaStream
      if (hasCamera) {
        log("Requesting camera and microphone access…")
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
        })
      } else {
        log("No camera available, falling back to audio-only…")
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        })
      }
      localStream.current = stream
      setMediaGranted(true)
      log("Media access granted")
      if (hasCamera) {
        const localVideo = document.createElement('video')
        localVideo.srcObject = stream
        localVideo.muted = true
        localVideo.autoplay = true
        localVideo.className = 'w-40 h-30 object-cover rounded'
        const container = document.getElementById('local-video-container')
        if (container) container.appendChild(localVideo)
        else log("Error: local-video-container not found")
      }
    } catch (err: unknown) {
      log(`getUserMedia error: ${err instanceof Error ? err.message : String(err)}`)
      setMediaGranted(false)
      throw err
    }
  }

  const connectWebSocket = () => {
    if (!user?.id || !callId) return
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      log("WebSocket already connected/connecting")
      return
    }
    const wsUrl = `ws://127.0.0.1:8000/ws/signaling/${callId}/${Number(user.id)}`
    log(`Connecting WS → ${wsUrl} (attempt ${retryCount.current + 1}/${maxRetries})`)
    ws.current = new WebSocket(wsUrl)
    ws.current.onopen = () => {
      retryCount.current = 0
      setWsConnected(true)
      log("WebSocket connected")
      const join: SignalMessage = { type: 'join-call', userId: Number(user.id), from: Number(user.id) }
      ws.current?.send(JSON.stringify(join))
    }
    ws.current.onclose = (event) => {
      setWsConnected(false)
      log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'none'}`)
      if (retryCount.current < maxRetries) {
        retryCount.current += 1
        const delay = Math.min(5000, 1000 * retryCount.current)
        log(`Reconnecting in ${delay}ms…`)
        setTimeout(connectWebSocket, delay)
      } else {
        log("Max WebSocket retries reached, giving up")
      }
    }
    ws.current.onerror = (event: Event) => {
      log(`WebSocket error: ${JSON.stringify(event)}`)
      try {
        const errorEvent = event as any
        if (errorEvent.message || errorEvent.reason) {
          log(`WebSocket error details: ${errorEvent.message || errorEvent.reason}`)
        }
      } catch (err: unknown) {
        log(`Error parsing WebSocket error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    ws.current.onmessage = handleSignal
  }

  const handleSignal = async (e: MessageEvent) => {
    try {
      const msg = JSON.parse(e.data) as SignalMessage
      if (msg.type === 'ping') {
        log('Ping')
        ws.current?.send(JSON.stringify({ type: 'pong' }))
        return
      }
      if ('from' in msg && msg.from === Number(user?.id)) return
      switch (msg.type) {
        case 'join-call': {
          log(`User ${msg.userId} joined call`)
          break
        }
        case 'new-peer': {
          const { peerId } = msg
          if (peerId !== Number(user?.id) && !pcs.current[peerId]) {
            setPeers(prev => (prev.includes(peerId) ? prev : [...prev, peerId]))
            if (Number(user?.id) < peerId) {
              await initiateCall(peerId)
            } else {
              log(`Skipping offer to ${peerId} (our ID ${user?.id} >= their ID ${peerId})`)
            }
          }
          break
        }
        case 'peer-list': {
          const { peers: list } = msg
          for (const pid of list) {
            if (pid !== Number(user?.id) && !pcs.current[pid]) {
              setPeers(prev => (prev.includes(pid) ? prev : [...prev, pid]))
              if (Number(user?.id) < pid) {
                await initiateCall(pid)
              } else {
                log(`Skipping offer to ${pid} (our ID ${user?.id} >= their ID ${pid})`)
              }
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
          if (videos.current[peerId]) {
            videos.current[peerId].remove()
            delete videos.current[peerId]
          }
          setPeers(prev => prev.filter(p => p !== peerId))
          offeredTo.current.delete(peerId)
          log(`Peer ${peerId} disconnected`)
          break
        }
        default:
          log(`Unknown message type: ${(msg as any).type}`)
      }
    } catch (err: unknown) {
      log(`Signal handling error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const createPeerConnection = (peerId: number): RTCPeerConnection | null => {
    if (peerId === Number(user?.id)) return null
    if (pcs.current[peerId]) return pcs.current[peerId]
    log(`Creating RTCPeerConnection for ${peerId}`)
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    localStream.current?.getTracks().forEach((track: MediaStreamTrack) => {
      pc.addTrack(track, localStream.current!)
      log(`Added track ${track.kind} to peer ${peerId}`)
    })
    pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
      if (ev.candidate && ws.current?.readyState === WebSocket.OPEN) {
        const msg: SignalMessage = {
          type: 'ice-candidate',
          candidate: ev.candidate.toJSON(),
          target: peerId,
          from: Number(user!.id)
        }
        ws.current.send(JSON.stringify(msg))
        log(`Sent ICE candidate to ${peerId}: ${JSON.stringify(ev.candidate)}`)
      }
    }
    pc.ontrack = (ev: RTCTrackEvent) => {
      const [stream] = ev.streams
      const trackTypes = stream.getTracks().map((t: MediaStreamTrack) => t.kind)
      log(`Received stream from ${peerId}: ${trackTypes.join(', ')}`)

      // Handle audio tracks
      if (stream.getAudioTracks().length > 0 && !audios.current[peerId]) {
        const audio = document.createElement('audio')
        audio.srcObject = stream
        audio.autoplay = true
        audio.controls = true
        audios.current[peerId] = audio
        audio.play().then(() => {
          log(`Remote audio playing from ${peerId}`)
        }).catch((err: Error) => {
          setAutoplayBlocked(true)
          log(`Autoplay blocked for audio from ${peerId}: ${err.message}`)
        })
      }

      // Handle video tracks
      if (stream.getVideoTracks().length > 0 && !videos.current[peerId]) {
        const video = document.createElement('video')
        video.srcObject = stream
        video.autoplay = true
        video.className = 'w-40 h-30 object-cover rounded'
        const videoContainer = document.getElementById('remote-videos-container')
        if (videoContainer) {
          videoContainer.appendChild(video)
          log(`Added video element for peer ${peerId}`)
        } else {
          log("Error: remote-videos-container not found")
        }
        videos.current[peerId] = video
        video.play().then(() => {
          log(`Remote video playing from ${peerId}`)
        }).catch((err: Error) => {
          setAutoplayBlocked(true)
          log(`Autoplay blocked for video from ${peerId}: ${err.message}`)
        })
      }
    }
    pc.oniceconnectionstatechange = () => {
      log(`Peer ${peerId} ICE state: ${pc.iceConnectionState}`)
    }
    pc.onconnectionstatechange = () => {
      log(`Peer ${peerId} state: ${pc.connectionState}`)
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        pc.close()
        delete pcs.current[peerId]
        audios.current[peerId]?.remove()
        delete audios.current[peerId]
        videos.current[peerId]?.remove()
        delete videos.current[peerId]
        setPeers(prev => prev.filter(p => p !== peerId))
        offeredTo.current.delete(peerId)
      }
    }
    pcs.current[peerId] = pc
    return pc
  }

  const initiateCall = async (peerId: number) => {
    if (peerId === Number(user?.id)) return
    if (offeredTo.current.has(peerId)) {
      log(`Offer already sent to ${peerId}, skipping`)
      return
    }
    if (Number(user?.id) >= peerId) {
      log(`Skipping offer to ${peerId} (our ID ${user?.id} >= their ID ${peerId})`)
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
        from: Number(user!.id)
      }
      ws.current?.send(JSON.stringify(msg))
      log(`Sent offer to ${peerId}`)
    } catch (err: unknown) {
      log(`initiateCall error (${peerId}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleOffer = async (from: number, sdp: string) => {
    const pc = createPeerConnection(from)
    if (!pc) return
    try {
      log(`Handling offer from ${from} in state ${pc.signalingState}`)
      if (pc.signalingState !== 'stable') {
        log(`Cannot handle offer from ${from} in state ${pc.signalingState}, ignoring`)
        return
      }
      await pc.setRemoteDescription({ type: 'offer', sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      const msg: SignalMessage = {
        type: 'answer',
        sdp: answer.sdp!,
        target: from,
        from: Number(user!.id)
      }
      ws.current?.send(JSON.stringify(msg))
      log(`Answered offer from ${from}`)
    } catch (err: unknown) {
      log(`handleOffer error (${from}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleAnswer = async (from: number, sdp: string) => {
    const pc = pcs.current[from]
    if (!pc) {
      log(`No peer connection for ${from}`)
      return
    }
    try {
      log(`Handling answer from ${from} in state ${pc.signalingState}`)
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription({ type: 'answer', sdp })
        log(`Set remote answer from ${from}`)
      } else {
        log(`Cannot set answer in state ${pc.signalingState} for ${from}`)
      }
    } catch (err: unknown) {
      log(`handleAnswer error (${from}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleIce = async (from: number, candidate: RTCIceCandidateInit) => {
    const pc = pcs.current[from]
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      log(`Added ICE candidate from ${from}`)
    } catch (err: unknown) {
      log(`addIceCandidate error (${from}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
        log(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`)
      } else {
        log("No video track available to toggle")
      }
    }
  }

  const enableAudioVideo = () => {
    const audioAttempts = Object.values(audios.current).map((a: HTMLAudioElement) =>
      a.play().catch((err: Error) => log(`Manual audio play failed: ${err.message}`))
    )
    const videoAttempts = Object.values(videos.current).map((v: HTMLVideoElement) =>
      v.play().catch((err: Error) => log(`Manual video play failed: ${err.message}`))
    )
    Promise.allSettled([...audioAttempts, ...videoAttempts]).then(() => setAutoplayBlocked(false))
  }

  if (!user) return null

  return (
    <div className="p-4 min-h-screen text-white bg-gray-900">
      <h1 className="text-2xl font-bold mb-4">Video Chat</h1>
      {/* <div className="mb-4 p-2 bg-gray-800 rounded font-mono text-sm space-y-1">
        <div><strong>Call:</strong> {callId}</div>
        <div><strong>WebSocket:</strong> {wsConnected ? '✅ Connected' : '❌ Disconnected'}</div>
        <div><strong>Camera & Mic:</strong> {mediaGranted ? '✅ Granted' : '❌ Denied'}</div>
        <div><strong>Camera:</strong> {cameraAvailable ? '✅ Available' : '❌ Not Available'}</div>
        <div><strong>Active peers:</strong> {peers.length ? peers.join(', ') : 'None'}</div>
      </div> */}
      {autoplayBlocked && (
        <div className="bg-red-600 p-4 rounded mb-4">
          <p>Audio or video is blocked by the browser. Please enable to continue.</p>
          <button
            onClick={enableAudioVideo}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mt-2"
          >
            Enable Audio/Video
          </button>
        </div>
      )}
      {!cameraAvailable && mediaGranted && (
        <div className="bg-yellow-600 p-4 rounded mb-4">
          <p>No camera detected. Proceeding with audio-only mode.</p>
        </div>
      )}
      <div className="mb-4">
        <button
          onClick={toggleVideo}
          className={`px-4 py-2 rounded ${videoEnabled && cameraAvailable ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} ${!cameraAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!cameraAvailable}
        >
          {videoEnabled && cameraAvailable ? 'Disable Video' : 'Enable Video'}
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <h3 className="font-semibold mb-1">Your Video</h3>
          <div id="local-video-container" className="w-40 h-30 bg-black rounded"></div>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Remote Videos</h3>
          <div id="remote-videos-container" className="flex flex-wrap gap-4"></div>
        </div>
      </div>
      {/* <div className="mt-4 p-2 bg-gray-800 rounded text-xs font-mono max-h-48 overflow-y-auto">
        <h3 className="font-semibold mb-1">Debug Log:</h3>
        {logLines.slice(-20).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div> */}
    </div>
  )
}