import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const TerminalUI = ({ socket }) => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const commandBuffer = useRef("");

  useEffect(() => {
    if (!terminalRef.current) return;

    terminal.current = new Terminal({
      cursorBlink: true,
      fontFamily: "monospace",
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff"
      }
    });

    terminal.current.open(terminalRef.current);
    terminal.current.write("Welcome to Docker Terminal\r\n$ ");

    terminal.current.onData((key) => {
      if (key.charCodeAt(0) === 13) {
        // ENTER key
        const command = commandBuffer.current.trim();
        if (command.length > 0) {
          socket.emit("input", command);
        }
        terminal.current.write("\r\n$ ");
        commandBuffer.current = "";
      } else if (key.charCodeAt(0) === 127) {
        // BACKSPACE
        if (commandBuffer.current.length > 0) {
          commandBuffer.current = commandBuffer.current.slice(0, -1);
          terminal.current.write("\b \b");
        }
      } else {
        commandBuffer.current += key;
        terminal.current.write(key);
      }
    });

    socket.on("output", (data) => {
      terminal.current.write(`\r\n${data}\r\n$ `);
    });

    return () => {
      socket.off("output");
    };
  }, [socket]);

  return (
    <div
      ref={terminalRef}
      style={{ width: "100%", height: "100%", backgroundColor: "black" }}
    />
  );
};

export default TerminalUI;
