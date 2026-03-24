'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `⚠️ Sorry, I ran into an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close chatbot' : 'Open API Finder Assistant'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          border: '1px solid rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.4)';
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          id="chatbot-window"
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            zIndex: 9998,
            width: '400px',
            height: '520px',
            borderRadius: '16px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'chatSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <style>{`
            @keyframes chatSlideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes dotPulse {
              0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
              40% { transform: scale(1); opacity: 1; }
            }
            #chatbot-window ::-webkit-scrollbar { width: 4px; }
            #chatbot-window ::-webkit-scrollbar-track { background: transparent; }
            #chatbot-window ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.2); border-radius: 2px; }
            @media (max-width: 480px) {
              #chatbot-window { width: calc(100vw - 24px); right: 12px; }
            }
            .chatbot-markdown-container p { margin-bottom: 8px; }
            .chatbot-markdown-container p:last-child { margin-bottom: 0; }
            .chatbot-markdown-container ul, .chatbot-markdown-container ol { margin-left: 20px; margin-bottom: 8px; }
            .chatbot-markdown-container li { margin-bottom: 4px; }
            .chatbot-markdown-container strong { font-weight: 700; color: inherit; }
          `}</style>

          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>
                  API Finder Assistant
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                  Marketplace Support
                </div>
              </div>
            </div>
            <button
              id="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)')}
            >
              ✕
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#FFFFFF',
            }}
          >
            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '40px' }}>⚡</div>
                <div style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, fontWeight: 500 }}>
                  Hi! How can I help you explore APIs today?
                </div>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '12px',
                    width: '100%',
                  }}
                >
                  {[
                    '"Search for payment APIs"',
                    '"Find animal facts APIs"',
                    '"Show me secure APIs (HTTPS)"',
                  ].map((ex, i) => (
                    <div
                      key={i}
                      onClick={() => { setInput(ex.replace(/"/g, '')); inputRef.current?.focus(); }}
                      style={{
                        color: '#3B82F6',
                        fontSize: '12px',
                        padding: '6px 0',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: 500,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#1D4ED8')}
                      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#3B82F6')}
                    >
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                      : '#FFFFFF',
                    color: msg.role === 'user' ? '#FFFFFF' : '#111827',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    wordBreak: 'break-word',
                  }}
                  className="chatbot-markdown-container"
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    gap: '5px',
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map(d => (
                    <div
                      key={d}
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#3B82F6',
                        animation: `dotPulse 1.4s ease-in-out ${d * 0.16}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #E5E7EB',
              background: '#FFFFFF',
              display: 'flex',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <input
              id="chatbot-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about marketplaces..."
              disabled={loading}
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#111827',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#3B82F6')}
              onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#D1D5DB')}
            />
            <button
              id="chatbot-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              style={{
                background: loading || !input.trim()
                  ? '#F3F4F6'
                  : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                width: '42px',
                height: '42px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <span style={{ color: loading || !input.trim() ? '#9CA3AF' : '#FFF' }}>➤</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
