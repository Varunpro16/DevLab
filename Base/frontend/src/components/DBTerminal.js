import React from "react";
import { useEffect, useRef, useState } from "react";
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';
import { Database, Server, User, Eye, EyeOff, Copy, Check } from 'lucide-react';

export default function DBTerminal({socket, userId, projectName, dbConfig}) {
    const podName = "mysql-pod-saii112-6fd65ffdb8-5th76";
    const terminalRef = useRef();
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Default config if not provided
    const config = dbConfig || {
        serviceName: "mysql-service-saii112",
        dbUser: "saii112restChecking",
        dbPassword: 'ngw0c873zo',
        dbName: 'restChecking-db',
        port: "3308"
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    useEffect(() => {
        // Initialize xterm.js terminal
        if(terminalRef.current){
            const terminal = new Terminal({
                useStyle: true,
                screenKeys: true,
                cursorBlink: true,
                cols: 100,
                rows: 25,
                theme: {
                    background: '#161b22',
                    foreground: '#d4d4d4',
                    cursor: '#ffffff',
                    selection: '#264f78',
                    black: '#000000',
                    red: '#cd3131',
                    green: '#0dbc79',
                    yellow: '#e5e510',
                    blue: '#2472c8',
                    magenta: '#bc3fbc',
                    cyan: '#11a8cd',
                    white: '#e5e5e5',
                    brightBlack: '#666666',
                    brightRed: '#f14c4c',
                    brightGreen: '#23d18b',
                    brightYellow: '#f5f543',
                    brightBlue: '#3b8eea',
                    brightMagenta: '#d670d6',
                    brightCyan: '#29b8db',
                    brightWhite: '#ffffff'
                },
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: 13,
                fontWeight: 400,
                lineHeight: 1.2,
            });
            
            const fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.open(terminalRef.current);
            
            // Fit terminal to container
            setTimeout(() => {
                fitAddon.fit();
            }, 100);

            // Create MySQL terminal connection
            socket.emit('create-mysql-terminal', {
                podName: podName,
                userId: userId,
                projectName: projectName,
                cols: terminal.cols,
                rows: terminal.rows
            });

            // Handle terminal output
            socket.on('mysql-terminal-output', (data) => {
                terminal.write(data);
            });

            // Handle terminal input
            terminal.onData((data) => {
                socket.emit('mysql-terminal-input', data);
            });

            return () => {
                if (terminal) {
                    terminal.dispose();
                }
            };
        }
    }, [userId, projectName, podName]);

    return (
        <div style={styles.container}>
            {/* Header Section */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.iconContainer}>
                        <Database size={24} color="#60a5fa" />
                    </div>
                    <div>
                        <h2 style={styles.title}>Database Terminal</h2>
                        <p style={styles.subtitle}>MySQL Connection - {projectName}</p>
                    </div>
                </div>

                {/* Connection Info Grid */}
                <div style={styles.grid}>
                    {/* Service Name */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardHeaderLeft}>
                                <Server size={16} color="#22c55e" />
                                <span style={styles.cardLabel}>Service</span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(config.serviceName, 'service')}
                                style={styles.copyButton}
                                onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {copiedField === 'service' ? 
                                    <Check size={16} color="#22c55e" /> : 
                                    <Copy size={16} color="#94a3b8" />
                                }
                            </button>
                        </div>
                        <p style={styles.cardValue}>{config.serviceName}</p>
                        <p style={styles.cardMeta}>Port: {config.port}</p>
                    </div>

                    {/* Database User */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardHeaderLeft}>
                                <User size={16} color="#60a5fa" />
                                <span style={styles.cardLabel}>User</span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(config.dbUser, 'user')}
                                style={styles.copyButton}
                                onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {copiedField === 'user' ? 
                                    <Check size={16} color="#22c55e" /> : 
                                    <Copy size={16} color="#94a3b8" />
                                }
                            </button>
                        </div>
                        <p style={styles.cardValue}>{config.dbUser}</p>
                        <p style={styles.cardMeta}>Database: {config.dbName}</p>
                    </div>

                    {/* Password */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardHeaderLeft}>
                                <div style={styles.passwordIcon}></div>
                                <span style={styles.cardLabel}>Password</span>
                            </div>
                            <div style={styles.buttonGroup}>
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.copyButton}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    {showPassword ? 
                                        <EyeOff size={16} color="#94a3b8" /> : 
                                        <Eye size={16} color="#94a3b8" />
                                    }
                                </button>
                                <button
                                    onClick={() => copyToClipboard(config.dbPassword, 'password')}
                                    style={styles.copyButton}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    {copiedField === 'password' ? 
                                        <Check size={16} color="#22c55e" /> : 
                                        <Copy size={16} color="#94a3b8" />
                                    }
                                </button>
                            </div>
                        </div>
                        <p style={styles.cardValue}>
                            {showPassword ? config.dbPassword : '•'.repeat(config.dbPassword.length)}
                        </p>
                        <p style={styles.cardMeta}>Click to {showPassword ? 'hide' : 'reveal'}</p>
                    </div>
                </div>

            </div>

            {/* Terminal Section */}
            <div style={styles.terminalSection}>
                <div style={styles.terminalContainer}>
                    <div 
                        ref={terminalRef} 
                        style={styles.terminal}
                    />
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#161b22',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        border: '1px solid #464647',
        overflow: 'hidden'
    },
    header: {
        background: '#161b22',
        padding: '16px',
        borderBottom: '1px solid #464647',
        height: '25%',
        minHeight: '300px'
    },
    headerTop: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
    },
    iconContainer: {
        padding: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#ffffff',
        margin: '0 0 4px 0'
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: '14px',
        margin: 0
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
    },
    card: {
        backgroundColor: 'rgba(45, 45, 48, 0.7)',
        borderRadius: '6px',
        padding: '12px',
        border: '1px solid #464647',
        backdropFilter: 'blur(10px)'
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    cardHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    cardLabel: {
        color: '#cbd5e1',
        fontSize: '14px',
        fontWeight: '500'
    },
    cardValue: {
        color: '#ffffff',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: '14px',
        margin: '4px 0',
        wordBreak: 'break-all'
    },
    cardMeta: {
        color: '#64748b',
        fontSize: '12px',
        margin: 0
    },
    copyButton: {
        padding: '4px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease'
    },
    copyButtonHover: {
        backgroundColor: '#464647'
    },
    buttonGroup: {
        display: 'flex',
        gap: '4px'
    },
    passwordIcon: {
        width: '16px',
        height: '16px',
        backgroundColor: '#f59e0b',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    commandContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    },
    commandTag: {
        padding: '4px 8px',
        backgroundColor: 'rgba(70, 70, 71, 0.5)',
        borderRadius: '12px',
        fontSize: '11px',
        color: '#cccccc',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        border: '1px solid #464647'
    },
    terminalSection: {
        flex: 1,
        padding: '8px',
        backgroundColor: '#161b22',
        height: '65%'
    },
    terminalContainer: {
        height: '100%',
        backgroundColor: '#161b22',
        borderRadius: '4px',
        border: '1px solid #161b22',
        overflow: 'hidden'
    },
    terminal: {
        height: '100%',
        width: '100%',
        padding: '8px',
        backgroundColor: '#161b22'
    }
};

// import React from "react";
// import { useEffect, useRef, useState } from "react";
// import { Terminal } from 'xterm';
// import 'xterm/css/xterm.css';
// import { FitAddon } from 'xterm-addon-fit';
// import { Database, Server, User, Eye, EyeOff, Copy, Check } from 'lucide-react';

// export default function DBTerminal({socket, userId, projectName, dbConfig}) {
//     const podName = "mysql-pod";
//     const terminalRef = useRef();
//     const [showPassword, setShowPassword] = useState(false);
//     const [copiedField, setCopiedField] = useState(null);

//     // Default config if not provided
//     const config = dbConfig || {
//         serviceName: "mysql-service",
//         dbUser: "root",
//         dbPassword: "password123",
//         dbName: "myapp_db",
//         port: "3306"
//     };

//     const copyToClipboard = (text, field) => {
//         navigator.clipboard.writeText(text);
//         setCopiedField(field);
//         setTimeout(() => setCopiedField(null), 2000);
//     };

//     useEffect(() => {
//         // Initialize xterm.js terminal
//         if(terminalRef.current){
//             const terminal = new Terminal({
//                 useStyle: true,
//                 screenKeys: true,
//                 cursorBlink: true,
//                 cols: 100,
//                 rows: 25,
//                 theme: {
//                     background: '#1e1e1e',
//                     foreground: '#d4d4d4',
//                     cursor: '#ffffff',
//                     selection: '#264f78',
//                     black: '#000000',
//                     red: '#cd3131',
//                     green: '#0dbc79',
//                     yellow: '#e5e510',
//                     blue: '#2472c8',
//                     magenta: '#bc3fbc',
//                     cyan: '#11a8cd',
//                     white: '#e5e5e5',
//                     brightBlack: '#666666',
//                     brightRed: '#f14c4c',
//                     brightGreen: '#23d18b',
//                     brightYellow: '#f5f543',
//                     brightBlue: '#3b8eea',
//                     brightMagenta: '#d670d6',
//                     brightCyan: '#29b8db',
//                     brightWhite: '#ffffff'
//                 },
//                 fontFamily: 'Monaco, Consolas, "Courier New", monospace',
//                 fontSize: 13,
//                 fontWeight: 400,
//                 lineHeight: 1.2,
//             });
            
//             const fitAddon = new FitAddon();
//             terminal.loadAddon(fitAddon);
//             terminal.open(terminalRef.current);
            
//             // Fit terminal to container
//             setTimeout(() => {
//                 fitAddon.fit();
//             }, 100);

//             // Create MySQL terminal connection
//             socket.emit('create-mysql-terminal', {
//                 podName: podName,
//                 userId: userId,
//                 projectName: projectName,
//                 cols: terminal.cols,
//                 rows: terminal.rows
//             });

//             // Handle terminal output
//             socket.on('mysql-terminal-output', (data) => {
//                 terminal.write(data);
//             });

//             // Handle terminal input
//             terminal.onData((data) => {
//                 socket.emit('mysql-terminal-input', data);
//             });

//             return () => {
//                 if (terminal) {
//                     terminal.dispose();
//                 }
//             };
//         }
//     }, [userId, projectName, podName]);

//     return (
//         <div style={styles.container}>
//             {/* Header Section */}
//             <div style={styles.header}>
//                 <div style={styles.headerTop}>
//                     <div style={styles.iconContainer}>
//                         <Database size={24} color="#60a5fa" />
//                     </div>
//                     <div>
//                         <h2 style={styles.title}>Database Terminal</h2>
//                         <p style={styles.subtitle}>MySQL Connection - {projectName}</p>
//                     </div>
//                 </div>

//                 {/* Connection Info Grid */}
//                 <div style={styles.grid}>
//                     {/* Service Name */}
//                     <div style={styles.card}>
//                         <div style={styles.cardHeader}>
//                             <div style={styles.cardHeaderLeft}>
//                                 <Server size={16} color="#22c55e" />
//                                 <span style={styles.cardLabel}>Service</span>
//                             </div>
//                             <button
//                                 onClick={() => copyToClipboard(config.serviceName, 'service')}
//                                 style={styles.copyButton}
//                                 onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
//                                 onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                             >
//                                 {copiedField === 'service' ? 
//                                     <Check size={16} color="#22c55e" /> : 
//                                     <Copy size={16} color="#94a3b8" />
//                                 }
//                             </button>
//                         </div>
//                         <p style={styles.cardValue}>{config.serviceName}</p>
//                         <p style={styles.cardMeta}>Port: {config.port}</p>
//                     </div>

//                     {/* Database User */}
//                     <div style={styles.card}>
//                         <div style={styles.cardHeader}>
//                             <div style={styles.cardHeaderLeft}>
//                                 <User size={16} color="#60a5fa" />
//                                 <span style={styles.cardLabel}>User</span>
//                             </div>
//                             <button
//                                 onClick={() => copyToClipboard(config.dbUser, 'user')}
//                                 style={styles.copyButton}
//                                 onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
//                                 onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                             >
//                                 {copiedField === 'user' ? 
//                                     <Check size={16} color="#22c55e" /> : 
//                                     <Copy size={16} color="#94a3b8" />
//                                 }
//                             </button>
//                         </div>
//                         <p style={styles.cardValue}>{config.dbUser}</p>
//                         <p style={styles.cardMeta}>Database: {config.dbName}</p>
//                     </div>

//                     {/* Password */}
//                     <div style={styles.card}>
//                         <div style={styles.cardHeader}>
//                             <div style={styles.cardHeaderLeft}>
//                                 <div style={styles.passwordIcon}></div>
//                                 <span style={styles.cardLabel}>Password</span>
//                             </div>
//                             <div style={styles.buttonGroup}>
//                                 <button
//                                     onClick={() => setShowPassword(!showPassword)}
//                                     style={styles.copyButton}
//                                     onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
//                                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                                 >
//                                     {showPassword ? 
//                                         <EyeOff size={16} color="#94a3b8" /> : 
//                                         <Eye size={16} color="#94a3b8" />
//                                     }
//                                 </button>
//                                 <button
//                                     onClick={() => copyToClipboard(config.dbPassword, 'password')}
//                                     style={styles.copyButton}
//                                     onMouseEnter={(e) => e.target.style.backgroundColor = styles.copyButtonHover.backgroundColor}
//                                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                                 >
//                                     {copiedField === 'password' ? 
//                                         <Check size={16} color="#22c55e" /> : 
//                                         <Copy size={16} color="#94a3b8" />
//                                     }
//                                 </button>
//                             </div>
//                         </div>
//                         <p style={styles.cardValue}>
//                             {showPassword ? config.dbPassword : '•'.repeat(config.dbPassword.length)}
//                         </p>
//                         <p style={styles.cardMeta}>Click to {showPassword ? 'hide' : 'reveal'}</p>
//                     </div>
//                 </div>

//                 {/* Quick Command */}
//                 <div style={styles.commandContainer}>
//                     <div style={styles.commandTag}>
//                         mysql -h {config.serviceName} -u {config.dbUser} -p
//                     </div>
//                 </div>
//             </div>

//             {/* Terminal Section */}
//             <div style={styles.terminalSection}>
//                 <div style={styles.terminalContainer}>
//                     <div 
//                         ref={terminalRef} 
//                         style={styles.terminal}
//                     />
//                 </div>
//             </div>
//         </div>
//     );
// }

// const styles = {
//     container: {
//         display: 'flex',
//         flexDirection: 'column',
//         height: '100%',
//         backgroundColor: '#161b22',
//         borderRadius: '8px',
//         boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
//         border: '1px solid #464647',
//         overflow: 'hidden'
//     },
//     header: {
//         background: '#161b22',
//         padding: '16px',
//         borderBottom: '1px solid #464647',
//         height: '25%',
//         minHeight: '180px'
//     },
//     headerTop: {
//         display: 'flex',
//         alignItems: 'center',
//         gap: '12px',
//         marginBottom: '16px'
//     },
//     iconContainer: {
//         padding: '8px',
//         backgroundColor: 'rgba(59, 130, 246, 0.1)',
//         borderRadius: '8px',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center'
//     },
//     title: {
//         fontSize: '20px',
//         fontWeight: 'bold',
//         color: '#ffffff',
//         margin: '0 0 4px 0'
//     },
//     subtitle: {
//         color: '#94a3b8',
//         fontSize: '14px',
//         margin: 0
//     },
//     grid: {
//         display: 'grid',
//         gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
//         gap: '16px',
//         marginBottom: '16px'
//     },
//     card: {
//         backgroundColor: '#161b22',
//         borderRadius: '6px',
//         padding: '12px',
//         border: '1px solid #464647',
//         backdropFilter: 'blur(10px)'
//     },
//     cardHeader: {
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         marginBottom: '8px'
//     },
//     cardHeaderLeft: {
//         display: 'flex',
//         alignItems: 'center',
//         gap: '8px'
//     },
//     cardLabel: {
//         color: '#cbd5e1',
//         fontSize: '14px',
//         fontWeight: '500'
//     },
//     cardValue: {
//         color: '#ffffff',
//         fontFamily: 'Monaco, Consolas, "Courier New", monospace',
//         fontSize: '14px',
//         margin: '4px 0',
//         wordBreak: 'break-all'
//     },
//     cardMeta: {
//         color: '#64748b',
//         fontSize: '12px',
//         margin: 0
//     },
//     copyButton: {
//         padding: '4px',
//         backgroundColor: 'transparent',
//         border: 'none',
//         borderRadius: '4px',
//         cursor: 'pointer',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         transition: 'background-color 0.2s ease'
//     },
//     copyButtonHover: {
//         backgroundColor: '#464647'
//     },
//     buttonGroup: {
//         display: 'flex',
//         gap: '4px'
//     },
//     passwordIcon: {
//         width: '16px',
//         height: '16px',
//         backgroundColor: '#f59e0b',
//         borderRadius: '50%',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         position: 'relative'
//     },
//     commandContainer: {
//         display: 'flex',
//         flexWrap: 'wrap',
//         gap: '8px'
//     },
//     commandTag: {
//         padding: '4px 8px',
//         backgroundColor: 'rgba(70, 70, 71, 0.5)',
//         borderRadius: '12px',
//         fontSize: '11px',
//         color: '#cccccc',
//         fontFamily: 'Monaco, Consolas, "Courier New", monospace',
//         border: '1px solid #464647'
//     },
//     terminalSection: {
//         flex: 1,
//         padding: '8px',
//         backgroundColor: '#161b22',
//         height: '75%'
//     },
//     terminalContainer: {
//         height: '100%',
//         backgroundColor: '#161b22',
//         borderRadius: '4px',
//         border: '1px solid #464647',
//         overflow: 'hidden'
//     },
//     terminal: {
//         height: '100%',
//         width: '100%',
//         padding: '8px',
//         backgroundColor: '#fffff',
//     }
// };

// import React from "react";
// import { useEffect, useRef } from "react";
// import { Terminal } from 'xterm';
// import 'xterm/css/xterm.css';
// import { FitAddon } from 'xterm-addon-fit';



// export default function DBTerminal({socket, userId, projectName}) {

//     const podName="mysql-pod"
//     const terminalRef = useRef();
    
//     useEffect(() => {
//         // Initialize xterm.js terminal
        
//         if(terminalRef.current){
//             const terminal = new Terminal({
//             useStyle: true,
//             screenKeys: true,
//             cursorBlink: true,
//             cols: 200,
//             theme: {
//                 background: '#1e1e1e',
//                 foreground: '#ffffff',
                
//             }
//             });
//             const fitAddon = new FitAddon();

//             terminal.loadAddon(fitAddon);
//             terminal.open(terminalRef.current);

//             // Create MySQL terminal connection
//             socket.emit('create-mysql-terminal', {
//                 podName: podName,
//                 userId: userId,
//                 projectName: projectName,
//                 cols: terminal.cols,
//                 rows: terminal.rows
//             });
            
//             // Handle terminal output
//             socket.on('mysql-terminal-output', (data) => {
//             terminal.write(data);
//             });
            
//             // Handle terminal input
//             terminal.onData((data) => {
//             socket.emit('mysql-terminal-input', data);
//             });
//             return () => {
//                 if (terminal) {
//                     terminal.dispose();
//                 }
//             };
//         }
        
        
        
        
//     }, [userId, projectName, podName]);
    
//     return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;

// }