import React, { useState, useRef } from 'react';
import { Send, Upload, X, FileText, Sparkles, Code2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import '../App.css';

const AIAssistant = ({ userId, projectName, language }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI coding assistant. I can help you improve your code, explain concepts, debug issues, and suggest optimizations. Upload files or ask me anything!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const fetchTree = async (path) => {
    try {
      console.log("Fetching path:", path);
      
      const res = await axios.post(`http://localhost:5000/api/projectStructure`, 
        { projectName: projectName, userId:userId, language:language }
      );
      
      console.log("Fetched items:", res.data);
     
    } catch (error) {
      console.error("Error fetching tree:", error);
    } finally {
    }
  };
  fetchTree()
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newFile = {
          name: file.name,
          content: e.target.result,
          size: file.size,
          type: file.type
        };
        setUploadedFiles(prev => [...prev, newFile]);
      };
      reader.readAsText(file);
    });
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      files: uploadedFiles,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // TODO: Replace with actual AI API call
      const response = await mockAIResponse(inputMessage, uploadedFiles);
      
      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock AI response - replace with actual AI API integration
  const mockAIResponse = async (message, files) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let response = '';
        
        if (files.length > 0) {
          response = `I've analyzed ${files.length} file(s). Here are some suggestions:\n\n`;
          files.forEach((file, index) => {
            response += `**${file.name}:**\n`;
            response += `- Consider adding error handling\n`;
            response += `- Code structure looks good\n`;
            response += `- You might want to add comments for clarity\n\n`;
          });
        }
        
        if (message.toLowerCase().includes('improve') || message.toLowerCase().includes('optimize')) {
          response += 'Here are some general improvement suggestions:\n\n';
          response += '1. Use meaningful variable names\n';
          response += '2. Add error handling and validation\n';
          response += '3. Consider breaking down large functions\n';
          response += '4. Add comments for complex logic\n';
          response += '5. Follow consistent code style\n';
        } else if (message.toLowerCase().includes('debug') || message.toLowerCase().includes('error')) {
          response += 'To help debug your code:\n\n';
          response += '1. Check console for error messages\n';
          response += '2. Add console.log statements\n';
          response += '3. Verify variable values at each step\n';
          response += '4. Check for typos and syntax errors\n';
        } else {
          response += `Regarding "${message}":\n\n`;
          response += 'I can help you with:\n';
          response += '- Code improvements and optimizations\n';
          response += '- Debugging and error resolution\n';
          response += '- Best practices and code review\n';
          response += '- Explaining concepts and syntax\n\n';
          response += 'Please upload your code files or ask specific questions!';
        }
        
        resolve(response);
      }, 1000);
    });
  };

  const quickPrompts = [
    { icon: Code2, text: 'Review my code', prompt: 'Please review the uploaded code and suggest improvements' },
    { icon: Sparkles, text: 'Optimize performance', prompt: 'How can I optimize the performance of this code?' },
    { icon: AlertCircle, text: 'Find bugs', prompt: 'Help me identify potential bugs or issues in this code' },
    { icon: FileText, text: 'Add comments', prompt: 'Add helpful comments to explain this code' }
  ];

  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <strong key={i}>{line.slice(2, -2)}</strong>;
      }
      if (line.startsWith('- ')) {
        return <li key={i}>{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <li key={i}>{line}</li>;
      }
      return <p key={i}>{line || <br />}</p>;
    });
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <Sparkles className="ai-icon" />
        <h3>AI Code Assistant</h3>
      </div>

      <div className="ai-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role} ${message.isError ? 'error' : ''}`}>
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {formatMessage(message.content)}
              {message.files && message.files.length > 0 && (
                <div className="message-files">
                  {message.files.map((file, i) => (
                    <div key={i} className="attached-file-display">
                      <FileText size={14} />
                      <span>{file.name}</span>
                      <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {uploadedFiles.length === 0 && messages.length <= 1 && (
        <div className="quick-prompts">
          <p className="quick-prompts-label">Quick actions:</p>
          <div className="quick-prompts-grid">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                className="quick-prompt-btn"
                onClick={() => handleQuickPrompt(prompt.prompt)}
              >
                <prompt.icon size={16} />
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <p className="uploaded-files-label">Attached files:</p>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="uploaded-file">
              <FileText size={16} />
              <span className="file-name">{file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => removeFile(index)} className="remove-file-btn">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ai-input-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.json,.xml,.md"
          style={{ display: 'none' }}
        />
        
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload code files"
        >
          <Upload size={18} />
        </button>

        <input
          type="text"
          className="ai-input"
          placeholder="Ask about your code, request improvements, or get help..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isLoading}
        />

        <button
          className="send-btn"
          onClick={handleSendMessage}
          disabled={isLoading || (!inputMessage.trim() && uploadedFiles.length === 0)}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;