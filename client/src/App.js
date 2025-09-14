
import './App.css';
import {Route, Routes} from "react-router-dom";
import Home from "./pages/Home.jsx";
import {SocketProvider} from "./providers/Socket.jsx";
import {PeerProvider} from "./providers/Peer.jsx";
import Room from './pages/Room.jsx';

function App() {
  return (
    <>
    <PeerProvider>
    <SocketProvider>
      
    <Routes>
      
      <Route path='/' element={<Home/>} />
      <Route path='/room/:roomId' element={<Room/>} />
     
    </Routes>
    
     </SocketProvider>
     </PeerProvider>
    </>
  );
}

export default App;
