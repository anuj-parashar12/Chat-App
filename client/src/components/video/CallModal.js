import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import SimplePeer from 'simple-peer';
import { clearActiveCall } from '../../features/ui/uiSlice';
import { getSocket } from '../../services/socket';

export default function CallModal() {
  const dispatch = useDispatch();
  const { activeCall } = useSelector((s) => s.ui);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting');

  useEffect(() => {
    if (!activeCall) return;

    const socket = getSocket();
    if (!socket) return;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeCall.type === 'video',
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new SimplePeer({
          initiator: activeCall.direction === 'outgoing',
          trickle: true,
          stream,
        });
        peerRef.current = peer;

        peer.on('signal', (data) => {
          if (data.type === 'offer') {
            socket.emit('call:initiate', { chatId: activeCall.chatId, type: activeCall.type, offer: data });
          } else {
            socket.emit('call:ice_candidate', { chatId: activeCall.chatId, callId: activeCall.callId, candidate: data, to: activeCall.from || '' });
          }
        });

        peer.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          setCallStatus('ongoing');
        });

        peer.on('error', () => handleEndCall());

        if (activeCall.direction === 'incoming' && activeCall.offer) {
          peer.signal(activeCall.offer);
        }

        socket.on('call:answered', ({ answer }) => {
          peer.signal(answer);
        });

        socket.on('call:ice_candidate', ({ candidate }) => {
          peer.signal(candidate);
        });

        socket.on('call:ended', () => handleEndCall());
      } catch (err) {
        console.error('Call setup failed:', err);
        handleEndCall();
      }
    };

    startCall();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
    };
  }, [activeCall]);

  const handleEndCall = () => {
    const socket = getSocket();
    if (activeCall) {
      socket?.emit('call:end', { callId: activeCall.callId, chatId: activeCall.chatId });
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.destroy();
    dispatch(clearActiveCall());
  };

  const handleAccept = () => {
    setCallStatus('connecting');
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioMuted(!audioMuted); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoOff(!videoOff); }
  };

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const isIncoming = activeCall.direction === 'incoming' && callStatus === 'connecting';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-2xl h-full max-h-[600px] bg-surface-900 rounded-2xl overflow-hidden flex flex-col">
        {/* Remote video */}
        {isVideo && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="flex-1 w-full object-cover bg-surface-950"
          />
        )}

        {!isVideo && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-brand-900 to-surface-950">
            <div className="text-center">
              <div className="w-24 h-24 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={40} className="text-white" />
              </div>
              <p className="text-white text-xl font-semibold">{activeCall.type === 'voice' ? 'Voice Call' : 'Call'}</p>
              <p className="text-zinc-400 mt-1">{callStatus === 'ongoing' ? 'In call' : isIncoming ? 'Incoming call' : 'Connecting...'}</p>
            </div>
          </div>
        )}

        {/* Local video pip */}
        {isVideo && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-20 right-4 w-32 h-24 rounded-xl object-cover border-2 border-surface-700"
          />
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-6 bg-surface-900/80 backdrop-blur">
          {isIncoming ? (
            <>
              <button onClick={handleAccept} className="w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition">
                <Phone size={24} className="text-white" />
              </button>
              <button onClick={handleEndCall} className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition">
                <PhoneOff size={24} className="text-white" />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleAudio} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${audioMuted ? 'bg-red-600' : 'bg-surface-700 hover:bg-surface-600'}`}>
                {audioMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
              </button>
              {isVideo && (
                <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${videoOff ? 'bg-red-600' : 'bg-surface-700 hover:bg-surface-600'}`}>
                  {videoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
                </button>
              )}
              <button onClick={handleEndCall} className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition">
                <PhoneOff size={24} className="text-white" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
