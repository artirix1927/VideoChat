
"use client"
import { useRef, useState, useCallback } from "react"



export const useLocalMedia = () => {
  const localStream = useRef<MediaStream | null>(null)
  const cameraStream = useRef<MediaStream | null>(null)
  const screenStream = useRef<MediaStream | null>(null)

  const [mediaGranted, setMediaGranted] = useState(false)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasCamera = devices.some(d => d.kind === 'videoinput')
      setCameraAvailable(hasCamera)
      return hasCamera
    } catch (err) {
      console.warn('enumerateDevices error', err)
      setCameraAvailable(false)
      return false
    }
  }

  const getMediaStream = useCallback(async () => {
    const hasCamera = await checkCameraAvailability()
    const audio: MediaStreamConstraints['audio'] = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

    if (hasCamera) {
      cameraStream.current = await navigator.mediaDevices.getUserMedia({
        audio,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      })
      localStream.current = cameraStream.current
      setVideoEnabled(cameraStream.current.getVideoTracks()[0]?.enabled ?? true)
      setMicEnabled(cameraStream.current.getAudioTracks()[0]?.enabled ?? true)
    } else {
      cameraStream.current = await navigator.mediaDevices.getUserMedia({ audio, video: false })
      localStream.current = cameraStream.current
      setVideoEnabled(false)
      setMicEnabled(cameraStream.current.getAudioTracks()[0]?.enabled ?? true)
    }
    setMediaGranted(true)
  }, [checkCameraAvailability])

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMicEnabled(track.enabled)
  }

  const toggleVideo = () => {
    const track = localStream.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setVideoEnabled(track.enabled)
  }

  const cleanupMedia = () => {
    cameraStream.current?.getTracks().forEach(t => t.stop()); cameraStream.current = null
    screenStream.current?.getTracks().forEach(t => t.stop()); screenStream.current = null
    localStream.current?.getTracks().forEach(t => t.stop()); localStream.current = null
    setMediaGranted(false)
    setScreenSharing(false)
    setAutoplayBlocked(false)
    setMicEnabled(true)
    setVideoEnabled(true)
  }

  return {
    localStream,
    cameraStream,
    screenStream,
    mediaGranted,
    cameraAvailable,
    autoplayBlocked,
    micEnabled,
    videoEnabled,
    screenSharing,
    setAutoplayBlocked,
    setScreenSharing,
    setVideoEnabled,
    getMediaStream,
    toggleMic,
    toggleVideo,
    cleanupMedia,
  }
}