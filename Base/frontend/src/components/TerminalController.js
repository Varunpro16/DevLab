import React, { useState, useEffect } from 'react';
import Terminal, { ColorMode, TerminalOutput } from 'react-terminal-ui';
import { 
  Monitor, 
  Square, 
  X 
} from "lucide-react";
const TerminalController = ({ userId, socket, projectPath }) => {

  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setInputValue("");         // Clear the input after sending

      handleInput(inputValue);   // Call your input handler
    }
  };
    const [terminalLineData, setTerminalLineData] = useState([
    <TerminalOutput></TerminalOutput>,
  ]);
    // Listen for messages from the server
  useEffect(() => {
    if (!socket) return;

    socket.on('terminalOutput', (data) => {
      setTerminalLineData((prev) => [
        ...prev,
        <TerminalOutput>{data}</TerminalOutput>,
      ]);
    });

    // Cleanup on unmount
    return () => {
      socket.off('terminalOutput');
    };
  }, [socket]);
    const handleInput = (terminalInput) => {
    // Add the user's input to the terminal UI
    setTerminalLineData((prev) => [
      ...prev,
      <TerminalOutput>{`> ${terminalInput}`}</TerminalOutput>,
    ]);

    // Send it to the server
    console.log("ter: ",terminalInput)
    socket.emit('terminalInput', terminalInput);
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Monitor size={16} className="panel-icon" />
          <span>Terminal</span>
        </div>
        <div className="panel-actions">
          <button className="panel-action-btn">
            <Square size={14} />
          </button>
          <button className="panel-action-btn">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="terminal-content">
        <div className="terminal-output">
          {terminalLineData}
        </div>
        <div className="terminal-input-line">
          <span className="terminal-prompt">$ </span>
          <input 
            className="terminal-input"
            type="text"
            placeholder="Type a command..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};


export default TerminalController







// import React, { useState, useEffect } from 'react';
// import Terminal, { ColorMode, TerminalOutput } from 'react-terminal-ui';

// const TerminalController = ({ socket }) => {
//   const [terminalLineData, setTerminalLineData] = useState([
//     <TerminalOutput>Welcome to the React Terminal!</TerminalOutput>,
//   ]);



//   // Listen for messages from the server
//   useEffect(() => {
//     if (!socket) return;

//     socket.on('terminalOutput', (data) => {
//       setTerminalLineData((prev) => [
//         ...prev,
//         <TerminalOutput>{data}</TerminalOutput>,
//       ]);
//     });

//     // Cleanup on unmount
//     return () => {
//       socket.off('terminalOutput');
//     };
//   }, [socket]);


//   const handleInput = (terminalInput) => {
//     // Add the user's input to the terminal UI
//     setTerminalLineData((prev) => [
//       ...prev,
//       <TerminalOutput>{`> ${terminalInput}`}</TerminalOutput>,
//     ]);

//     // Send it to the server
//     console.log("ter: ",terminalInput)
//     socket.emit('terminalInput', terminalInput);
//   };

//   return (
//     <div className="container">
       
//       <Terminal
//         name="Terminal"
//         colorMode={ColorMode.Light}
//         onInput={handleInput}
//       >
//         {terminalLineData}
//       </Terminal>
//     </div>
//   );
// };

// export default TerminalController;
