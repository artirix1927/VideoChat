"use client"
import { useEffect, useRef, useState } from 'react'

export default function VideoChat() {
  const [callId, setCallId] = useState('')
  const [userId] = useState(() => Math.floor(Math.random() * 100000))
  const [connected, setConnected] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peersRef = useRef<{ [userId: number]: RTCPeerConnection }>({})
  const wsRef = useRef<WebSocket | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!callId || connected) return
    initWebRTC()
  }, [callId, initWebRTC, connected])

  async function initWebRTC() {
    const ws = new WebSocket(`ws://localhost:8000/ws/signaling/${callId}/${userId}`)
    wsRef.current = ws

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    localStreamRef.current = localStream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data)
      const fromUser = message.from
      const data = message.data
      if (fromUser === userId) return

      let pc = peersRef.current[fromUser]
      if (!pc) {
        pc = createPeerConnection(fromUser)
        peersRef.current[fromUser] = pc
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
      }

      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        ws.send(JSON.stringify(answer))
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data))
      } else if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data))
      }
    }

    ws.onopen = () => {
      setConnected(true)
    }
  }

  function createPeerConnection(targetUserId: number) {
    const pc = new RTCPeerConnection()

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({ ...event.candidate.toJSON(), target: targetUserId }))
      }
    }

    pc.ontrack = (event) => {
      const remoteVideo = document.createElement('video')
      remoteVideo.autoplay = true
      remoteVideo.playsInline = true
      remoteVideo.className = 'w-48 rounded-lg shadow'
      remoteVideo.srcObject = event.streams[0]
      videoContainerRef.current?.appendChild(remoteVideo)
    }

    return pc
  }

  return (
    <div className="p-4 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Group Video Chat</h1>

      {!connected ? (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter Call ID"
            className="px-4 py-2 border rounded w-full max-w-sm"
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
          />
          <button
            onClick={initWebRTC}
            disabled={!callId}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            Join Call
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-gray-700">You joined call: <strong>{callId}</strong></p>
          <div id="videos" ref={videoContainerRef} className="flex flex-wrap gap-4">
            <video ref={localVideoRef} autoPlay muted className="w-48 rounded-lg shadow border" />
          </div>
        </div>
      )}
    </div>
  )
}
