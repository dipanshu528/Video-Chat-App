import React, { useMemo, useEffect } from "react";
import { io } from "socket.io-client";
import { usePeer } from "./Peer";  // <-- import Peer context

const SocketContext = React.createContext(null);

export const useSocket = () => {
  return React.useContext(SocketContext);
};

export const SocketProvider = (props) => {
  const socket = useMemo(() => io("https://video-chat-app-85zn.onrender.com"), []);
  const { peer } = usePeer(); // access peer from PeerProvider

  useEffect(() => {
    if (!peer) return;

    // When someone sends an offer
    socket.on("update-offer", async ({ offer, emailId }) => {
      console.log("📩 Received offer from:", emailId);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      // Send answer back
      socket.emit("update-answer", { emailId, answer });
    });

    // When someone sends an answer
    socket.on("update-answer", async ({ answer }) => {
      console.log("📩 Received answer");
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    return () => {
      socket.off("update-offer");
      socket.off("update-answer");
    };
  }, [socket, peer]);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};









