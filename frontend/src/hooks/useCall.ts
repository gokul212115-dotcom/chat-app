import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuthStore } from '../store/authStore';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
export type CallType = 'audio' | 'video';

interface IncomingCallData {
  fromUserId: number;
  conversationId: number;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useCall() {
  const socket = useSocket();
  const currentUser = useAuthStore((state) => state.user);

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [remoteUserId, setRemoteUserId] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setRemoteUserId(null);
    setIncomingCall(null);
    pendingCandidatesRef.current = [];
  }, [localStream]);

  const createPeerConnection = useCallback((targetUserId: number) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          toUserId: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, cleanupCall]);

  const startCall = useCallback(async (targetUserId: number, conversationId: number, type: CallType) => {
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
      setCallType(type);
      setRemoteUserId(targetUserId);
      setCallStatus('calling');

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:offer', {
        toUserId: targetUserId,
        conversationId,
        offer,
        callType: type,
      });
    } catch (error) {
      console.error('Failed to start call:', error);
      cleanupCall();
    }
  }, [socket, createPeerConnection, cleanupCall]);

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      });
      setLocalStream(stream);
      setCallType(incomingCall.callType);
      setRemoteUserId(incomingCall.fromUserId);

      const pc = createPeerConnection(incomingCall.fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', {
        toUserId: incomingCall.fromUserId,
        answer,
      });

      setIncomingCall(null);
      setCallStatus('connected');
    } catch (error) {
      console.error('Failed to accept call:', error);
      cleanupCall();
    }
  }, [socket, incomingCall, createPeerConnection, cleanupCall]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:reject', { toUserId: incomingCall.fromUserId });
    setIncomingCall(null);
  }, [socket, incomingCall]);

  const endCall = useCallback(() => {
    if (socket && remoteUserId) {
      socket.emit('call:end', { toUserId: remoteUserId });
    }
    cleanupCall();
  }, [socket, remoteUserId, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }, [localStream]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: IncomingCallData) => {
      if (callStatus !== 'idle') {
        socket.emit('call:reject', { toUserId: data.fromUserId });
        return;
      }
      setIncomingCall(data);
      setCallStatus('ringing');
    };

    const handleCallAnswered = async (data: { fromUserId: number; answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      for (const candidate of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
      setCallStatus('connected');
    };

    const handleIceCandidate = async (data: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        pendingCandidatesRef.current.push(data.candidate);
      }
    };

    const handleCallRejected = () => {
      cleanupCall();
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, callStatus, cleanupCall]);

  return {
    callStatus,
    callType,
    remoteUserId,
    incomingCall,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    currentUserId: currentUser?.id,
  };
}
