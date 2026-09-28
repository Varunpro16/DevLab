import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
const OPTIONS_TERM = {
    useStyle: true,
    screenKeys: true,
    cursorBlink: true,
    cols: 200,
    theme: {
        background: "black"
    }
};
const fitAddon = new FitAddon();
function ab2str(buf) {
  return new TextDecoder('utf-8').decode(buf);
}

export default function TerminalComponent({socket}) {
  const termRef = useRef();

  useEffect(() => {
    if (!termRef || !termRef.current || !socket) {
        return;
    }
    socket.emit("requestTerminal");
    socket.on("terminal", terminalHandler)
    const term = new Terminal(OPTIONS_TERM);
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();
    function terminalHandler({ data }) {
        if (data instanceof ArrayBuffer) {
            console.error(data);
            console.log(ab2str(data))
            term.write(ab2str(data))
        }
    }

  
    term.onData((data) => {
        socket.emit('terminalData', {
            data
        });
    });

    socket.emit('terminalData', {
        data: '\n'
    });

    return () => {
        socket.off("terminal")
    }
  }, [termRef]);

  return <div ref={termRef} style={{ height: '500px', width: '100%', background: '#000' }} />;
}
