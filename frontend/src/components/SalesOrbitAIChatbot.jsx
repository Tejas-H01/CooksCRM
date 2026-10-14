import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  HelpCircle, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Minimize2
} from 'lucide-react';

export const SalesOrbitAIChatbot = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const role = currentUser?.role || 'RM';

  // Role-specific quick prompts
  const quickPrompts = role === 'RM' 
    ? [
        "Which leads need my attention today?",
        "What is my target gap?",
        "Show my priority actions.",
        "Show my high-value opportunities."
      ]
    : role === 'BRANCH_MANAGER'
    ? [
        "Which RM needs attention?",
        "Why is my branch below target?",
        "Show high-value branch risks.",
        "Which RM has the largest target gap?"
      ]
    : role === 'REGIONAL_HEAD'
    ? [
        "Which branch needs attention?",
        "Show regional performance summary.",
        "Which branch has the highest risk?",
        "Show high-value regional opportunities."
      ]
    : [
        "Show system performance summary.",
        "Show recent system audit logs."
      ];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: `Good morning, **${currentUser?.username || 'User'}**! 👋 I am **SalesOrbit AI**, your operational CRM assistant. Ask me anything about your PostgreSQL pipeline, targets, priority actions, or risk telemetry.`,
          tools: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isAuthenticated) return null;

  const handleSendMessage = async (textToSend) => {
    const prompt = textToSend || inputMessage;
    if (!prompt || !prompt.strip?.() && !prompt.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.sendAIChatMessage(prompt);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.message,
        tools: response.tool_calls_executed || [],
        dataSummary: response.data_context_summary || {},
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: "I couldn't retrieve your operational telemetry right now. Please verify backend connection and try again.",
          tools: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      
      {/* Floating Chat Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #01c58a 0%, #3ea4f5 100%)',
            border: 'none',
            color: '#fff',
            padding: '0.85rem 1.35rem',
            borderRadius: '30px',
            boxShadow: '0 8px 24px rgba(1, 197, 138, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            transition: 'transform 0.2s ease',
            animation: 'pulse 2s infinite'
          }}
        >
          <Sparkles size={20} />
          <span>SalesOrbit AI</span>
        </button>
      )}

      {/* Expanded Chatbot Drawer Panel */}
      {isOpen && (
        <div
          className="glass-card"
          style={{
            width: '420px',
            height: '580px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--border-glass-hover)',
            borderRadius: '16px',
            overflow: 'hidden',
            padding: 0,
            background: 'var(--bg-card)'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(1, 197, 138, 0.2) 0%, rgba(62, 164, 245, 0.15) 100%)',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #01c58a 0%, #3ea4f5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  SalesOrbit AI
                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(1, 197, 138, 0.2)', color: 'var(--accent-rm)', fontWeight: 700 }}>
                    {role}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  PostgreSQL Controlled Telemetry Intelligence
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts Container */}
          <div style={{ padding: '0.65rem 1rem', background: 'var(--input-bg)', borderBottom: '1px solid var(--border-glass)', display: 'flex', gap: '0.4rem', overflowX: 'auto', flexShrink: 0 }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.72rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-glass-hover)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                ⚡ {prompt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.75rem 1rem',
                    borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #3ea4f5 0%, #01c58a 100%)' : 'var(--input-bg)',
                    color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                    fontSize: '0.85rem',
                    lineHeight: '1.45',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-glass-hover)'
                  }}
                >
                  {msg.text}

                  {/* Tools Executed / Data Source Badge */}
                  {msg.sender === 'ai' && msg.tools && msg.tools.length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Layers size={11} />
                      <span>Data Context: {msg.tools.join(', ')}</span>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', padding: '0 0.2rem' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent-rm)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Executing controlled PostgreSQL tools...
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--input-bg)',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask SalesOrbit AI..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #01c58a 0%, #3ea4f5 100%)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                cursor: 'pointer',
                opacity: isLoading || !inputMessage.trim() ? 0.5 : 1
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
