import { useEffect } from "react";
import TerminalUI from "./TerminalUI";


const Terminal = ({ socket }) => {
  useEffect(() => {
    if (!socket) return;

    socket.on("output", (data) => {
      console.log("Received from server:", data);
    });

    return () => {
      socket.off("output");
    };
  }, [socket]);

  return (
    <div>
      <TerminalUI socket={socket}/>
    </div>
  );
};

export default Terminal;
