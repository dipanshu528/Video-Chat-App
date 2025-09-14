import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams,useNavigate } from "react-router-dom";
import { useSocket } from "../providers/Socket.jsx";
import { usePeer } from "../providers/Peer.jsx";
import "../style/room.css";

const Room = () => {
  const socket = useSocket();
  const { peer, createOffer, createAnswer, setRemoteAns, sendStream, remoteStream } = usePeer();

  const [myStream, setMyStream] = useState(null);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  

  const [messages, setMessages] = useState([]);
const [chatInput, setChatInput] = useState("");
  // queue for ICE candidates that arrive early
const pendingCandidates = useRef([]);

  // remember who we’re connected to for signaling
  const remoteEmailRef = useRef(null);


// const [isAudioMuted, setIsAudioMuted] = useState(false);
const [isVideoPaused, setIsVideoPaused] = useState(false);
const [callEnded, setCallEnded] = useState(false);




  const getUserMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      // add tracks to the peer immediately
      await sendStream(stream);
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  }, [sendStream]);

  // when someone new joins, we (caller) create an offer
  const handleNewUserJoined = useCallback(async (data) => {
    const { emailId } = data;
    console.log('new user joined', emailId);
    remoteEmailRef.current = emailId;

    // ensure our tracks are added before creating the offer
    if (!myStream) {
      await getUserMediaStream();
    }

    const offer = await createOffer();
    socket.emit("call-user", { emailId, offer });
  }, [createOffer, socket, myStream, getUserMediaStream]);

  // when we receive an offer, we (callee) answer
  const handleIncommingCall = useCallback(async (data) => {
  const { from, offer } = data;
  console.log("📩 Incoming call from", from, offer);
  remoteEmailRef.current = from;

  if (!myStream) {
    await getUserMediaStream();
  }

  const ans = await createAnswer(offer);
  socket.emit("call-accepted", { emailId: from, ans });

  // ✅ flush queued ICE candidates
  for (const candidate of pendingCandidates.current) {
    await peer.addIceCandidate(candidate);
  }
  pendingCandidates.current = [];
}, [createAnswer, socket, myStream, getUserMediaStream, peer]);


  const handleCallAccepted = useCallback(async (data) => {
  const { ans } = data;
  await setRemoteAns(ans);
  console.log("✅ Call accepted", ans);

  // ✅ flush queued ICE candidates
  for (const candidate of pendingCandidates.current) {
    await peer.addIceCandidate(candidate);
  }
  pendingCandidates.current = [];
}, [setRemoteAns, peer]);


  // === ICE CANDIDATE EXCHANGE ===
  useEffect(() => {
    if (!peer || !socket) return;

    const onIceCandidate = (event) => {
      if (event.candidate && remoteEmailRef.current) {
        socket.emit("ice-candidate", {
          emailId: remoteEmailRef.current,   // send to the other person
          candidate: event.candidate
        });
      }
    };

    peer.addEventListener("icecandidate", onIceCandidate);
    return () => {
      peer.removeEventListener("icecandidate", onIceCandidate);
    };
  }, [peer, socket]);



  useEffect(() => {
  if (!socket || !peer) return;

  const onRemoteIceCandidate = async ({ candidate }) => {
    try {
      if (peer.remoteDescription) {
        await peer.addIceCandidate(candidate);
        console.log("✅ Added ICE candidate immediately", candidate);
      } else {
        pendingCandidates.current.push(candidate);
        console.log("⏳ Queued ICE candidate", candidate);
      }
    } catch (err) {
      console.error("❌ Error adding ice candidate", err);
    }
  };

  socket.on("ice-candidate", onRemoteIceCandidate);
  return () => {
    socket.off("ice-candidate", onRemoteIceCandidate);
  };
}, [socket, peer]);




  // register room signaling events
  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incomming-call", handleIncommingCall);
    socket.on("call-accepted", handleCallAccepted);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incomming-call", handleIncommingCall);
      socket.off("call-accepted", handleCallAccepted);
    };
  }, [handleIncommingCall, handleNewUserJoined, socket, handleCallAccepted]);



  // get devices on mount (caller/callee both)
  useEffect(() => {
    getUserMediaStream();
  }, [getUserMediaStream]);




  // attach local stream
  useEffect(() => {
    if (myStream && myVideoRef.current) {
      myVideoRef.current.srcObject = myStream;
    }
    console.log(myStream);
  }, [myStream]);




  // attach remote stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log("✅ Remote stream attached", remoteStream);
    }
  }, [remoteStream]);


  useEffect(() => {
  if (!socket) return;

  const onRemoteToggleVideo = ({ isVideoPaused }) => {
    if (remoteVideoRef.current) {
      if (isVideoPaused) {
        // hide video (pause)
        remoteVideoRef.current.style.display = "none";
      } else {
        // show video again
        remoteVideoRef.current.style.display = "block";
      }
    }
  };

  socket.on("toggle-video", onRemoteToggleVideo);

  return () => {
    socket.off("toggle-video", onRemoteToggleVideo);
  };
}, [socket]);

useEffect(() => {
  if (!socket) return;

  const onChatMessage = ({ from, message }) => {
    setMessages(prev => [...prev, { from, message }]);
  };

  socket.on("chat-message", onChatMessage);
  return () => socket.off("chat-message", onChatMessage);
}, [socket]);


const sendChatMessage = () => {
  if (!chatInput.trim() || !remoteEmailRef.current) return;

  // display locally
  setMessages(prev => [...prev, { from: "You", message: chatInput }]);

  // send to remote
  socket.emit("chat-message", {
    emailId: remoteEmailRef.current,
    message: chatInput
  });

  setChatInput("");
};





useEffect(() => {
  if (!socket) return;

  // 🎤 Remote muted/unmuted mic
  socket.on("remote-audio-toggled", ({ isMuted }) => {
    alert(isMuted ? "🔇 Your partner muted their mic" : "🎤 Your partner unmuted their mic");
  });

  // 🎥 Remote paused/resumed video (you already have this, just add alert if you want)
  socket.on("remote-video-toggled", ({ isPaused }) => {
    alert(isPaused ? "📷 Your partner paused their video" : "📷 Your partner resumed their video");
  });

  // 📞 Remote ended call
  socket.on("remote-call-ended", () => {
    alert("❌ Your partner has ended the call");
  });

  return () => {
    socket.off("remote-audio-toggled");
    socket.off("remote-video-toggled");
    socket.off("remote-call-ended");
  };
}, [socket]);





  // Toggle Mic
// const toggleAudio = () => {
//   if (myStream) {
//     myStream.getAudioTracks().forEach(track => {
//       track.enabled = !track.enabled;
//       setIsAudioMuted(!track.enabled);
//     });

//      // 🔔 Notify remote user
//     socket.emit("toggle-audio", { roomId, isMuted: !audioTrack.enabled });
//   }
// };

// Toggle Camera
const toggleVideo = () => {
  if (myStream) {
    myStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
      const paused = !track.enabled;
      setIsVideoPaused(paused);

      // notify remote peer
      if (remoteEmailRef.current) {
        socket.emit("toggle-video", {
          emailId: remoteEmailRef.current,
          isVideoPaused: paused
        });
      }
    });
  }
};


// End Call
const endCall = () => {
  // Stop all local tracks
  if (myStream) {
    myStream.getTracks().forEach(track => track.stop());
  }

  // Close peer connection
  peer.close();

  // Reset refs
  if (myVideoRef.current) myVideoRef.current.srcObject = null;
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

  setCallEnded(true);

  // 🔔 Notify remote user
  socket.emit("end-call", { roomId });
  navigate("/");
};


  return (

<div className="room">
      <div className="video-grid">
        <div className="video-container">
          <video ref={myVideoRef} autoPlay playsInline muted className="video" />
          <span className="video-label">You</span>
        </div>
        <div className="video-container">
          <video ref={remoteVideoRef} autoPlay playsInline className="video" />
          <span className="video-label">Guest</span>
        </div>
      </div>

      <div className="chat-box">
  <div className="messages">
    {messages.map((m, i) => (
      <div key={i} className="message">
        {m.from}: <strong>{m.message}</strong>
      </div>
    ))}
  </div>

  <div className="chat-input">
    <input
      type="text"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      placeholder="Type a message..."
    />
    <button onClick={sendChatMessage}>Send</button>
  </div>
</div>


      <div className="controls">
        {/* <button onClick={toggleAudio} className="control-btn">
          {isAudioMuted ? "🔇" : "🎤"}
        </button> */}
        <button onClick={toggleVideo} className="control-btn">
          {isVideoPaused ? "❌" : "📷"}
        </button>
        <button onClick={endCall} className="control-btn end">
          📞
        </button>
      </div>
    </div>
  );
};

export default Room;





