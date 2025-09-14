import React, {useState, useEffect} from 'react';
import "../style/home.css";
import {useSocket} from "../providers/Socket.jsx"
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [roomId ,setRoomId] = useState("");

    const handleRoomJoined = ({roomId})=>{
        navigate(`/room/${roomId}`)
        console.log("room joined", roomId);
    }

    useEffect(()=>{
         if (!socket) return;

    // ✅ Match backend event name
    socket.on("joined-room", handleRoomJoined);

    // ✅ Cleanup to prevent multiple listeners
    return () => {
      socket.off("joined-room", handleRoomJoined);
    };
    },[socket])
   
const handleRoomJoin = ()=>{
      if (!email || !roomId) {
      alert("Please fill in both fields");
      return;
    }
    socket.emit('join-room', { emailId: email, roomId: roomId });
}

  return (

    <div className="homepage-container">
  <div className="join-card">
    <h1 className="title">Join a room</h1>

    <div className="form">
      <input type="email" value={email} placeholder="Enter your email" className="input" onChange={e => setEmail(e.target.value)} />
      <input type="text" value={roomId} placeholder="Enter room code" className="input" onChange={e => setRoomId(e.target.value)} />
      <button onClick={handleRoomJoin} className="btn">Enter room</button>
    </div>
  </div>
</div>

   
  )
}

export default Home
