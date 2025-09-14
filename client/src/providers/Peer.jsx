import React, {useCallback, useEffect, useMemo, useState} from "react";

const PeerContext = React.createContext(null);

export const usePeer =()=> React.useContext(PeerContext);

export const PeerProvider = (props)=>{
 const [remoteStream, setRemoteStream] = useState(null);

   const peer = useMemo(() => new RTCPeerConnection({
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ]
    }
  ]
}), []);



    const createOffer = async()=>{
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        return offer;
    }
    
    const createAnswer = async(offer) =>{
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        return answer;
    };

    const setRemoteAns = async(ans)=>{
         await peer.setRemoteDescription(ans);
    }

    const sendStream = async (stream) => {
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
};

    
   // Handle incoming remote track
  const handleTrackEvent = useCallback((event) => {
    const incomingTrack = event.track;

    setRemoteStream((prevStream) => {
      const tracks = prevStream ? prevStream.getTracks().filter(t => t.kind !== incomingTrack.kind) : [];
      return new MediaStream([...tracks, incomingTrack]);
    });
  }, []);

  useEffect(() => {
    peer.addEventListener("track", handleTrackEvent);
    return () => peer.removeEventListener("track", handleTrackEvent);
  }, [peer, handleTrackEvent]);
    



    useEffect(() => {
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("📡 New ICE candidate:", event.candidate);
    }
  };
}, [peer]);


    return(
        <PeerContext.Provider value={{peer, createOffer, createAnswer, setRemoteAns, sendStream, remoteStream}}>
            {props.children}
        </PeerContext.Provider>
    )
    
}

