import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface SignalPayload {
  type: "offer" | "answer" | "ice-candidate";
  from: string;
  to: string;
  data: any;
}

export function useWebRTC(
  meetingId: string,
  myId: string,
  role: "teacher" | "student",
  localStream: MediaStream | null
) {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Send signal via broadcast
  const sendSignal = useCallback(
    (signal: SignalPayload) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: signal,
        });
      }
    },
    []
  );

  // Create a new peer connection for a remote user
  const createPeer = useCallback(
    (remoteId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(remoteId, remoteStream);
            return next;
          });
        }
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            from: myId,
            to: remoteId,
            data: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(remoteId);
            return next;
          });
          peersRef.current.delete(remoteId);
        }
      };

      peersRef.current.set(remoteId, pc);
      return pc;
    },
    [localStream, myId, sendSignal]
  );

  // Add buffered ICE candidates
  const flushCandidates = useCallback(
    (remoteId: string, pc: RTCPeerConnection) => {
      const pending = pendingCandidatesRef.current.get(remoteId);
      if (pending) {
        pending.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
        pendingCandidatesRef.current.delete(remoteId);
      }
    },
    []
  );

  // Handle incoming signals
  const handleSignal = useCallback(
    async (signal: SignalPayload) => {
      // Ignore our own signals
      if (signal.from === myId) return;
      // Ignore signals not for us (unless broadcast to 'teacher')
      if (signal.to !== myId && signal.to !== role) return;

      if (signal.type === "offer") {
        // Someone sent us an offer - create peer and answer
        const pc = createPeer(signal.from);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        flushCandidates(signal.from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          from: myId,
          to: signal.from,
          data: answer,
        });
      } else if (signal.type === "answer") {
        const pc = peersRef.current.get(signal.from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          flushCandidates(signal.from, pc);
        }
      } else if (signal.type === "ice-candidate") {
        const pc = peersRef.current.get(signal.from);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.data)).catch(console.error);
        } else {
          // Buffer until remote description is set
          const pending = pendingCandidatesRef.current.get(signal.from) || [];
          pending.push(signal.data);
          pendingCandidatesRef.current.set(signal.from, pending);
        }
      }
    },
    [myId, role, createPeer, sendSignal, flushCandidates]
  );

  // Subscribe to signaling channel
  useEffect(() => {
    if (!meetingId || !myId) return;

    const channel = supabase.channel(`webrtc-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      handleSignal(payload as SignalPayload);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      // Clean up peer connections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [meetingId, myId, handleSignal]);

  // Student: send offer to teacher when stream is ready
  const sendOffer = useCallback(
    async (targetId: string) => {
      const pc = createPeer(targetId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        from: myId,
        to: targetId,
        data: offer,
      });
    },
    [createPeer, sendSignal, myId]
  );

  return { remoteStreams, sendOffer };
}
