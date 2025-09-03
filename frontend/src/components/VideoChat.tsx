"use client"
import { useAuth } from '@/AuthContext'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { RemotePeer } from '@/types';
import { useLocalMedia } from '@/hooks/useLocalMedia';
import { useCallSession } from '@/hooks/useCallSession';

function Tile({
  title,
  stream,
  isLocal,
  setAutoplayBlocked,
}: { title: string; stream: MediaStream | null; isLocal?: boolean; setAutoplayBlocked: (v: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasVideo = !!stream?.getVideoTracks()?.length
  const hasAudio = !!stream?.getAudioTracks()?.length

  useEffect(() => {
    if (!stream) return
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current
        .play()
        .catch(() => setAutoplayBlocked(true))
    }
    if (audioRef.current && !isLocal) {
      audioRef.current.srcObject = stream
      audioRef.current
        .play()
        .catch(() => setAutoplayBlocked(true))
    }
  }, [stream, isLocal, setAutoplayBlocked])

  return (
    <div className="relative bg-neutral-800 rounded-2xl overflow-hidden aspect-video group">
      {hasVideo ? (
        <video ref={videoRef} className="w-full h-full object-cover" muted={isLocal} playsInline />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center text-xl">{title[0]?.toUpperCase()}</div>
        </div>
      )}
      {!isLocal && hasAudio && <audio ref={audioRef} className="hidden" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2 opacity-80">
          {!hasAudio && IconMute()}
          {!hasVideo && IconVideoOff()}
        </div>
      </div>
    </div>
  )
}

function CallButton({
  icon,
  title,
  onClick,
  active,
  danger,
  disabled,
}: {
  icon: () => React.ReactNode
  title?: string
  onClick?: () => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  const base = `inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm transition
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
  `
  const styles = danger
    ? 'bg-red-600 hover:bg-red-700'
    : active === false
    ? 'bg-neutral-800 border border-neutral-700'
    : 'bg-neutral-800'

  return (
    <button className={`${base} ${styles}`} onClick={onClick} title={title} disabled={disabled}>
      {icon()}
    </button>
  )
}

/* ---------------- Icons (unchanged) ---------------- */
function IconMic() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" />
      <path strokeLinecap="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 21v-3" />
    </svg>
  )
}
function IconMute() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" />
      <path strokeLinecap="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 21v-3" />
      <path strokeLinecap="round" d="m4 4 16 16" />
    </svg>
  )
}
function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M15 10.5 20 8v8l-5-2.5M4 7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}
function IconVideoOff() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M15 10.5 20 8v8l-5-2.5M4 7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path strokeLinecap="round" d="m4 4 16 16" />
    </svg>
  )
}
function IconScreen() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
    </svg>
  )
}
function IconScreenOn() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M5 7h14" />
    </svg>
  )
}
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 1 0 7 7l1-1" />
    </svg>
  )
}
function IconLeave() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M13 17H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h6" />
      <path strokeLinecap="round" d="m16 15 4-3-4-3" />
    </svg>
  )
}
function IconVideo2() { return IconVideo() } // alias

/* ---------------- Main Page (wires hooks back to the original UI) ---------------- */
export default function VideoChatPage() {
  const { id } = useParams<{ id: string }>()
  const callId = id
  const { user } = useAuth()
  const myId = Number(user?.id)

  const {
    localStream, cameraStream, screenStream,
    mediaGranted, cameraAvailable, autoplayBlocked,
    micEnabled, videoEnabled, screenSharing,
    setAutoplayBlocked, setScreenSharing, setVideoEnabled,
    getMediaStream, toggleMic, toggleVideo, cleanupMedia,
  } = useLocalMedia()

  const {
    peers, remotes, wsConnected, connectWebSocket,
    startScreenShare, stopScreenShare, cleanup: cleanupCall,
  } = useCallSession({
    myId,
    callId: callId ?? '',
    localStream,
    cameraStream,
    screenStream,
    setScreenSharing,
    setVideoEnabled,
    setAutoplayBlocked,
  })

  const log = useCallback((...a: any[]) => console.log('[VideoChat]', ...a), [])

  useEffect(() => {
    const onUnload = () => {
      cleanupCall()
      cleanupMedia()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      cleanupCall()
      cleanupMedia()
    }
  }, [])

  useEffect(() => {
    if (!myId || !callId) return
    let cancelled = false;
    (async () => {
      try {
        await getMediaStream()
        if (!cancelled) connectWebSocket()
      } catch (e) {
        log('Init error:', e)
      }
    })()
    return () => { cancelled = true }
  }, [myId, callId]) // ✅ only primitive deps

  const participants: RemotePeer[] = useMemo(
    () => peers.map(pid => ({ id: pid, stream: remotes[pid] })).filter(p => !!p.stream),
    [peers, remotes]
  )

  const inviteUrl = typeof window !== 'undefined' ? window.location.href : ''

  const leaveCall = () => {
    cleanupCall()
    cleanupMedia()
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) window.history.back()
    }
  }

  const enableAutoplay = () => {
    const vids = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[]
    Promise.allSettled(vids.map(el => el.play()))
      .then(() => setAutoplayBlocked(false))
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') toggleMic()
      if (e.key.toLowerCase() === 'v') toggleVideo()
      if (e.key.toLowerCase() === 's') (screenSharing ? stopScreenShare() : startScreenShare())
      if (e.key === 'Escape') leaveCall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screenSharing, toggleMic, toggleVideo, startScreenShare, stopScreenShare])

  if (!user) return null

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600" />
          <div>
            <h1 className="text-lg font-semibold">Call · {callId}</h1>
            <div className="text-xs text-neutral-400">
              {wsConnected ? 'Connected' : 'Reconnecting…'} · {participants.length + 1} in call
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">M</kbd> mute&nbsp;&nbsp;
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">V</kbd> video&nbsp;&nbsp;
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">S</kbd> share&nbsp;&nbsp;
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">Esc</kbd> leave
        </div>
      </header>

      {/* Notices */}
      {autoplayBlocked && (
        <div className="mx-4 mt-3 bg-yellow-600/20 border border-yellow-500 text-yellow-100 p-3 rounded-xl">
          Audio/video playback was blocked by the browser. Click
          <button onClick={enableAutoplay} className="ml-2 underline underline-offset-2">Enable</button>
          .
        </div>
      )}
      {!cameraAvailable && mediaGranted && (
        <div className="mx-4 mt-3 bg-neutral-800 border border-neutral-700 text-neutral-200 p-3 rounded-xl">
          No camera detected. You’re in audio-only mode.
        </div>
      )}

      {/* Grid */}
      <main className="flex-1 p-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <Tile title="You" stream={localStream.current} isLocal setAutoplayBlocked={setAutoplayBlocked} />
          {participants.map(p => (
            <Tile key={p.id} title={`User ${p.id}`} stream={p.stream} setAutoplayBlocked={setAutoplayBlocked} />
          ))}
        </div>
      </main>

      {/* Control bar */}
      <footer className="sticky bottom-0 w-full pb-6">
        <div className="mx-auto max-w-3xl bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-2xl px-3 py-2 flex items-center justify-center gap-2">
          <CallButton
            active={micEnabled}
            onClick={toggleMic}
            title={micEnabled ? 'Mute (M)' : 'Unmute (M)'}
            icon={micEnabled ? IconMic : IconMute}
          />
          <CallButton
            active={videoEnabled}
            onClick={toggleVideo}
            title={videoEnabled ? 'Stop video (V)' : 'Start video (V)'}
            icon={videoEnabled ? IconVideo : IconVideoOff}
            disabled={!cameraAvailable}
          />
          <CallButton
            active={screenSharing}
            onClick={screenSharing ? stopScreenShare : startScreenShare}
            title={screenSharing ? 'Stop sharing (S)' : 'Share screen (S)'}
            icon={screenSharing ? IconScreenOn : IconScreen}
          />
          <div className="mx-1 w-px self-stretch bg-neutral-800" />
          {/* <CallButton
            onClick={() => {
              if (!inviteUrl) return
              navigator.clipboard.writeText(inviteUrl).catch(() => {})
            }}
            title="Copy invite link"
            icon={IconLink}
          /> */}
          <div className="mx-1 w-px self-stretch bg-neutral-800" />
          <CallButton
            danger
            onClick={leaveCall}
            title="Leave"
            icon={IconLeave}
          />
        </div>
      </footer>
    </div>
  )
}