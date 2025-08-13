"use client"
import { useAuth } from '@/AuthContext'
import { useEffect, useRef, useState } from 'react'

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]


export default function VoiceChat() {
  const [callId, setCallId] = useState('')
  const { user } = useAuth()
  const [status, setStatus] = useState('Disconnected')
  const [peers, setPeers] = useState<number[]>([])

  const localStream = useRef<MediaStream | null>(null)
  const pcs = useRef<Record<number, {
    pc: RTCPeerConnection
    pendingCandidates: RTCIceCandidateInit[]
  }>>({})
  const audios = useRef<Record<number, HTMLAudioElement>>({})
  const ws = useRef<WebSocket | null>(null)
  
  const cleanup = () => {
    console.log("Cleaning up...")
    Object.keys(pcs.current).forEach(id => cleanupPeer(+id))
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    ws.current?.close()
    ws.current = null
    setPeers([])
    setStatus("Disconnected")
  }

  useEffect(() => cleanup, [])

  if (!user) return null

  const log = (msg: string) => {
    console.log(msg)
    setStatus(s => `${s}\n${msg}`)
  }

  const cleanupPeer = (id: number) => {
    log(`Cleaning peer ${id}`)
    pcs.current[id]?.pc.close()
    delete pcs.current[id]
    audios.current[id]?.remove()
    delete audios.current[id]
    setPeers(p => p.filter(pid => pid !== id))
  }

  const createPeer = (peerId: number) => {
    if (pcs.current[peerId]) return pcs.current[peerId].pc

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    const pendingCandidates: RTCIceCandidateInit[] = []
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!)
      })
    }

    pc.onicecandidate = e => {
      if (e.candidate) {
        log(`Sending ICE candidate to ${peerId}`)
        ws.current?.send(JSON.stringify({ 
          type: 'ice-candidate', 
          candidate: e.candidate.toJSON(), 
          target: peerId, 
          from: user.id 
        }))
      }
    }

    pc.ontrack = e => {
      const [stream] = e.streams
      if (!audios.current[peerId]) {
        const audio = document.createElement('audio')
        audio.autoplay = true
        audio.controls = true
        document.body.appendChild(audio)
        audios.current[peerId] = audio
        log(`Created audio element for peer ${peerId}`)
      }
      audios.current[peerId].srcObject = stream
      log(`Received remote stream from ${peerId}`)
    }

    pc.onconnectionstatechange = () => {
      log(`Peer ${peerId} connection state: ${pc.connectionState}`)
      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        cleanupPeer(peerId)
      }
    }

    pcs.current[peerId] = { pc, pendingCandidates }
    return pc
  }

  const handleOffer = async (from: number, sdp: string) => {
    log(`Received offer from ${from}`)
    const { pc, pendingCandidates } = pcs.current[from] || { 
      pc: createPeer(from), 
      pendingCandidates: [] 
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
      log(`Set remote description for ${from}`)
      
      // Process any pending ICE candidates
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift()!
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        log(`Processed pending ICE candidate for ${from}`)
      }
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      log(`Created answer for ${from}`)
      
      ws.current?.send(JSON.stringify({ 
        type: 'answer', 
        sdp: answer.sdp, 
        target: from, 
        from: user.id 
      }))
    } catch (err) {
      log(`Error handling offer: ${err}`)
    }
  }

  const handleAnswer = async (from: number, sdp: string) => {
    log(`Received answer from ${from}`)
    const { pc, pendingCandidates } = pcs.current[from] || { 
      pc: createPeer(from), 
      pendingCandidates: [] 
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
      log(`Set remote description (answer) for ${from}`)
      
      // Process any pending ICE candidates
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift()!
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        log(`Processed pending ICE candidate for ${from}`)
      }
    } catch (err) {
      log(`Error handling answer: ${err}`)
    }
  }

  const handleIce = async (from: number, candidate: RTCIceCandidateInit) => {
    log(`Received ICE candidate from ${from}`)
    const peerData = pcs.current[from] || { 
      pc: createPeer(from), 
      pendingCandidates: [] 
    }
    
    try {
      if (peerData.pc.remoteDescription) {
        await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate))
        log(`Added ICE candidate for ${from}`)
      } else {
        peerData.pendingCandidates.push(candidate)
        log(`Queued ICE candidate for ${from} (waiting for remote description)`)
      }
    } catch (err) {
      log(`Error adding ICE candidate: ${err}`)
    }
  }

  const initiateCall = async (peerId: number) => {
    log(`Initiating call with ${peerId}`)
    const pc = createPeer(peerId)
    
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      log(`Created offer for ${peerId}`)
      
      ws.current?.send(JSON.stringify({ 
        type: 'offer', 
        sdp: offer.sdp, 
        target: peerId, 
        from: user.id 
      }))
    } catch (err) {
      log(`Error creating offer: ${err}`)
    }
  }

  const initConnection = async () => {
    if (!callId) return
    cleanup()
    setStatus("Connecting...")

    try {
      // Get user media
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      log("Got local media stream")
      
      // Create self-monitoring audio
      const localAudio = document.createElement('audio')
      localAudio.srcObject = localStream.current
      localAudio.controls = true
      document.body.appendChild(localAudio)
      log("Created local audio element")

      // Connect to signaling server
      ws.current = new WebSocket(`ws://localhost:8000/ws/signaling/${callId}/${user.id}`)

      ws.current.onopen = () => {
        log("Connected to signaling server")
        ws.current?.send(JSON.stringify({
          type: 'join-call',
          userId: user.id,
          from: user.id
        }))
      }

      ws.current.onclose = () => {
        log("Disconnected from signaling server")
        cleanup()
      }

      ws.current.onerror = (e) => {
        log(`WebSocket error: ${e}`)
      }

      ws.current.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.from === user.id) return // Skip messages from self
          
          log(`Received message type: ${msg.type}`)
          switch (msg.type) {
            case 'new-peer':
              if (!pcs.current[msg.peerId]) {
                setPeers(p => [...p, msg.peerId])
                setTimeout(() => initiateCall(msg.peerId), 500) // Small delay to ensure peer is ready
              }
              break
            case 'offer': await handleOffer(msg.from, msg.sdp); break
            case 'answer': await handleAnswer(msg.from, msg.sdp); break
            case 'ice-candidate': await handleIce(msg.from, msg.candidate); break
            case 'peer-disconnected': cleanupPeer(msg.peerId); break
            default: log(`Unknown message type: ${msg.type}`)
          }
        } catch (err) {
          log(`Error handling message: ${err}`)
        }
      }
    } catch (err) {
      log(`Initialization error: ${err}`)
      cleanup()
    }
  }




  return (
    <div className="p-4 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Voice Chat</h1>

      <div className="mb-4 p-2 bg-gray-800 rounded font-mono text-sm">
        <div>Status: {status.split('\n').at(-1)}</div>
        <div>Peers: {peers.join(', ') || 'None'}</div>
        <div>Local stream: {localStream.current ? 'Yes' : 'No'}</div>
      </div>

      {status.includes('Disconnected') ? (
        <div className="space-y-4 max-w-md">
          <input
            value={callId}
            onChange={e => setCallId(e.target.value)}
            placeholder="Enter Call ID"
            className="px-4 py-2 border rounded w-full text-white"
          />
          <button
            onClick={initConnection}
            disabled={!callId}
            className={`px-4 py-2 rounded w-full ${
              callId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500'
            }`}
          >
            Join Call
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p>Call ID: <strong>{callId}</strong></p>
              <p>Your ID: <strong>{user.id}</strong></p>
            </div>
            <button
              onClick={cleanup}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Leave Call
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 p-2 bg-gray-800 rounded text-xs font-mono max-h-40 overflow-y-auto">
        <h3 className="font-semibold mb-1">Debug Log:</h3>
        {status.split('\n').slice(-10).map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  )
}
