"use client"
import { STUN_SERVERS } from "@/constants"
import { SignalMessage } from "@/types"
import { useRef, useState, useCallback } from "react"

type MediaStreamRef = ReturnType<typeof useRef<MediaStream | null>>

export const useCallSession = ({
  myId,
  callId,
  localStream,
  cameraStream,
  screenStream,
  setScreenSharing,
  setVideoEnabled,
  setAutoplayBlocked,
}: {
  myId: number
  callId: string
  localStream: MediaStreamRef
  cameraStream: MediaStreamRef
  screenStream: MediaStreamRef
  setScreenSharing: (v: boolean) => void
  setVideoEnabled: (v: boolean) => void
  setAutoplayBlocked: (v: boolean) => void
}) => {
  const pcs = useRef<Record<number, RTCPeerConnection>>({})
  const senders = useRef<Record<number, { audio?: RTCRtpSender; video?: RTCRtpSender }>>({})
  const ws = useRef<WebSocket | null>(null)

  const [peers, setPeers] = useState<number[]>([])
  const [remotes, setRemotes] = useState<Record<number, MediaStream>>({})
  const [wsConnected, setWsConnected] = useState(false)

  /** Helpers */
  const setRemoteStream = useCallback((peerId: number, stream: MediaStream) => {
    setRemotes(prev => (prev[peerId] === stream ? prev : { ...prev, [peerId]: stream }))
    setPeers(prev => (prev.includes(peerId) ? prev : [...prev, peerId]))
  }, [])

  const removePeer = useCallback((peerId: number) => {
    pcs.current[peerId]?.close()
    delete pcs.current[peerId]
    delete senders.current[peerId]

    setPeers(prev => prev.filter(p => p !== peerId))
    setRemotes(prev => {
      const n = { ...prev }
      delete n[peerId]
      return n
    })
  }, [])

  /** WebRTC Peer Setup */
  function createPeerConnection(peerId: number) {
    if (pcs.current[peerId]) return pcs.current[peerId]
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        const sender = pc.addTrack(track, localStream.current!)
        if (!senders.current[peerId]) senders.current[peerId] = {}
        if (track.kind === "audio") senders.current[peerId].audio = sender
        if (track.kind === "video") senders.current[peerId].video = sender
      })
    }

    pc.onicecandidate = ev => {
      if (ev.candidate && ws.current?.readyState === WebSocket.OPEN) {
        const msg: SignalMessage = { type: "ice-candidate", candidate: ev.candidate.toJSON(), target: peerId, from: myId }
        ws.current.send(JSON.stringify(msg))
      }
    }

    pc.ontrack = ev => {
      const [stream] = ev.streams
      if (stream) setRemoteStream(peerId, stream)
    }

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) removePeer(peerId)
    }

    pcs.current[peerId] = pc
    return pc
  }

  /** Signaling Handlers */
  const initiateCall = useCallback(async (peerId: number) => {
    if (!myId || peerId === myId || pcs.current[peerId]) return
    if (myId >= peerId) return // simple tie-breaker
    const pc = createPeerConnection(peerId)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    ws.current?.send(JSON.stringify({ type: "offer", sdp: offer.sdp!, target: peerId, from: myId }))
  }, [myId])

  const handleOffer = useCallback(async (from: number, sdp: string) => {
    const pc = createPeerConnection(from)
    await pc.setRemoteDescription({ type: "offer", sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    ws.current?.send(JSON.stringify({ type: "answer", sdp: answer.sdp!, target: from, from: myId }))
  }, [myId])

  const handleAnswer = useCallback(async (from: number, sdp: string) => {
    const pc = pcs.current[from]
    if (!pc) return
    await pc.setRemoteDescription({ type: "answer", sdp })
  }, [])

  const handleIce = useCallback(async (from: number, candidate: RTCIceCandidateInit) => {
    const pc = pcs.current[from]
    if (!pc) return
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }, [])

  /** WebSocket Setup */
  const handleSignal = useCallback(async (e: MessageEvent) => {
    const msg = JSON.parse(e.data) as SignalMessage
    if (msg.type === "ping") { ws.current?.send(JSON.stringify({ type: "pong" })); return }
    if ("from" in msg && msg.from === myId) return

    switch (msg.type) {
      case "new-peer": if (msg.peerId !== myId) await initiateCall(msg.peerId); break
      case "peer-list": for (const pid of msg.peers) if (pid !== myId) await initiateCall(pid); break
      case "offer": await handleOffer(msg.from, msg.sdp); break
      case "answer": await handleAnswer(msg.from, msg.sdp); break
      case "ice-candidate": await handleIce(msg.from, msg.candidate); break
      case "peer-disconnected": removePeer(msg.peerId); break
    }
  }, [myId, initiateCall, handleOffer, handleAnswer, handleIce, removePeer])

  const connectWebSocket = useCallback(() => {
    if (!myId || !callId) return
    if (ws.current && ws.current.readyState <= 1) return // already connecting/open

    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/signaling/${callId}/${myId}`)

    ws.current.onopen = () => {
      setWsConnected(true)
      ws.current?.send(JSON.stringify({ type: "join-call", userId: myId, from: myId } satisfies SignalMessage))
    }
    ws.current.onclose = () => setWsConnected(false)
    ws.current.onerror = () => setWsConnected(false)
    ws.current.onmessage = handleSignal
  }, [myId, callId, handleSignal])

  /** Screen Sharing */
  const startScreenShare = useCallback(async () => {
    if (screenStream.current) return
    screenStream.current = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = screenStream.current.getVideoTracks()[0]
    Object.values(senders.current).forEach(s => s.video?.replaceTrack(screenTrack))

    localStream.current = new MediaStream([...(cameraStream.current?.getAudioTracks() ?? []), screenTrack])
    setScreenSharing(true)
    setVideoEnabled(true)

    screenTrack.onended = () => stopScreenShare()
  }, [cameraStream, setScreenSharing, setVideoEnabled])

  const stopScreenShare = useCallback(() => {
    if (!screenStream.current) return
    const camVideo = cameraStream.current?.getVideoTracks()[0] || null
    Object.values(senders.current).forEach(s => s.video?.replaceTrack(camVideo))

    localStream.current = cameraStream.current
    screenStream.current.getTracks().forEach(t => t.stop())
    screenStream.current = null

    setScreenSharing(false)
    setVideoEnabled(!!camVideo?.enabled)
  }, [cameraStream, setScreenSharing, setVideoEnabled])

  /** Cleanup */
  const cleanup = useCallback(() => {
    Object.values(pcs.current).forEach(pc => pc.close())
    pcs.current = {}
    senders.current = {}
    cameraStream.current?.getTracks().forEach(t => t.stop()); cameraStream.current = null
    screenStream.current?.getTracks().forEach(t => t.stop()); screenStream.current = null
    localStream.current?.getTracks().forEach(t => t.stop()); localStream.current = null
    ws.current?.close()
    ws.current = null

    setWsConnected(false)
    setPeers([])
    setRemotes({})
    setScreenSharing(false)
    setAutoplayBlocked(false)
  }, [setScreenSharing, setAutoplayBlocked])

  return { peers, remotes, wsConnected, connectWebSocket, initiateCall, startScreenShare, stopScreenShare, removePeer, cleanup }
}
