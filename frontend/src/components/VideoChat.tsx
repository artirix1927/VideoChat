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
  const {user} = useAuth()
  const [status, setStatus] = useState('Disconnected')
  const [peers, setPeers] = useState<number[]>([])

  const localStream = useRef<MediaStream | null>(null)
  const pcs = useRef<Record<number, RTCPeerConnection>>({})
  const audios = useRef<Record<number, HTMLAudioElement>>({})
  const ws = useRef<WebSocket | null>(null)


  const cleanup = () => {
    log("Cleaning up...")
    Object.keys(pcs.current).forEach(id => cleanupPeer(+id))
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    ws.current?.close()
    ws.current = null
    setPeers([])
    setStatus("Disconnected")
  }


  useEffect(() => cleanup, [])

  if (!user ) return

  
  
  const log = (msg: string) => {
    console.log(msg)
    setStatus(s => `${s}\n${msg}`)
  }

  const cleanupPeer = (id: number) => {
    log(`Cleaning peer ${id}`)
    pcs.current[id]?.close()
    delete pcs.current[id]
    audios.current[id]?.remove()
    delete audios.current[id]
    setPeers(p => p.filter(pid => pid !== id))
  }



  const createPeer = (peerId: number) => {
    if (pcs.current[peerId]) return pcs.current[peerId]

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current!))
    }

    pc.onicecandidate = e => {
      if (e.candidate) {
        ws.current?.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate, target: peerId, from: user.id }))
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
      }
      audios.current[peerId].srcObject = stream
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(pc.connectionState)) cleanupPeer(peerId)
    }

    pcs.current[peerId] = pc
    return pc
  }

  const handleOffer = async (from: number, sdp: string) => {
    const pc = createPeer(from)
    await pc.setRemoteDescription({ type: 'offer', sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    ws.current?.send(JSON.stringify({ type: 'answer', sdp: answer.sdp, target: from, from: user }))
  }

  const handleAnswer = async (from: number, sdp: string) => {
    const pc = pcs.current[from]
    if (!pc) return
    await pc.setRemoteDescription({ type: 'answer', sdp })
  }

  const handleIce = async (from: number, candidate: RTCIceCandidateInit) => {
    const pc = pcs.current[from]
    if (!pc) return
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }

  const initiateCall = async (peerId: number) => {
    const pc = createPeer(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    ws.current?.send(JSON.stringify({ type: 'offer', sdp: offer.sdp, target: peerId, from: user.id }))
  }

  const initConnection = async () => {
    if (!callId) return
    cleanup()
    setStatus("Connecting...")

    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      ws.current = new WebSocket(`ws://localhost:8000/ws/signaling/${callId}/${user.id}`)

      ws.current.onopen = () => {
        log("Connected to signaling")
        ws.current?.send(JSON.stringify({
          type: 'join-call',
          userId: user.id,
          from: user.id
        }))
      }

      ws.current.onclose = cleanup
      ws.current.onerror = e => log(`WebSocket error: ${e}`)
      ws.current.onmessage = async e => {
        const msg = JSON.parse(e.data)
        if (msg.from === user.id && msg.from !== 'system') return
        switch (msg.type) {
          case 'new-peer':
            if (!pcs.current[msg.peerId]) {
              setPeers(p => p.includes(msg.peerId) ? p : [...p, msg.peerId])
              setTimeout(() => initiateCall(msg.peerId), 500)
            }
            break
          case 'offer': await handleOffer(msg.from, msg.sdp); break
          case 'answer': await handleAnswer(msg.from, msg.sdp); break
          case 'ice-candidate': await handleIce(msg.from, msg.candidate); break
          case 'peer-disconnected': cleanupPeer(msg.peerId); break
        }
      }
    } catch (e) {
      log(`Init error: ${e}`)
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
