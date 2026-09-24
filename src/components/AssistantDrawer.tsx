/**
 * Procurement Assistant — a branded, slide-out chat that talks to the Copilot
 * Studio "Procurement Assistant" agent via the Microsoft 365 Agents SDK.
 *
 * The agent runs on the GitHub Copilot harness with Entra sign-in, so it can't
 * be embedded through the standard connector or an iframe. Instead we sign the
 * user in with MSAL (popup) and stream the conversation directly through the
 * Copilot Studio client, rendering the replies in our own chat bubbles.
 */

import { useEffect, useRef, useState } from 'react';
import { useAssistant } from '../state/AssistantContext';
import { useAppState } from '../state/AppState';
import { askAssistant, getRedirectUri, resetAssistant, startConversation, type AssistantReply } from '../services/assistantClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedActions?: string[];
}

type Phase = 'idle' | 'connecting' | 'ready' | 'thinking' | 'error';

const SUGGESTED_PROMPTS = [
  'How do I create a purchase requisition?',
  'What is the approval workflow?',
  'Which products are in the catalog?',
];

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

function firstNameOf(full?: string): string {
  return full?.trim().split(/\s+/)[0] ?? '';
}

export function AssistantDrawer() {
  const { open, openAssistant, closeAssistant } = useAssistant();
  const { currentWorker, userFullName } = useAppState();

  const [phase, setPhase] = useState<Phase>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const firstName = firstNameOf(currentWorker?.name ?? userFullName);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, phase]);

  function appendReplies(replies: AssistantReply[]) {
    if (replies.length === 0) return;
    setMessages((prev) => [
      ...prev,
      ...replies.map((reply) => ({
        id: nextId(),
        role: 'assistant' as const,
        text: reply.text,
        suggestedActions: reply.suggestedActions,
      })),
    ]);
  }

  async function handleConnect() {
    setError('');
    setPhase('connecting');
    try {
      const { conversationId: convId, replies } = await startConversation();
      setConversationId(convId);
      if (replies.length > 0) {
        appendReplies(replies);
      } else {
        setMessages([
          {
            id: nextId(),
            role: 'assistant',
            text: `Hi${firstName ? ` ${firstName}` : ''}! I'm your Procurement Assistant. Ask me about requisitions, approvals, or the product catalog.`,
            suggestedActions: SUGGESTED_PROMPTS,
          },
        ]);
      }
      setPhase('ready');
    } catch (err) {
      resetAssistant();
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setPhase('error');
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || phase === 'thinking' || phase === 'connecting') return;

    setInput('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
    setPhase('thinking');
    setError('');
    try {
      const replies = await askAssistant(trimmed, conversationId);
      appendReplies(replies);
      setPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPhase('ready');
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  }

  const connected = phase === 'ready' || phase === 'thinking';
  const busy = phase === 'thinking';

  return (
    <>
      {!open && (
        <button
          type="button"
          className="assistant-fab"
          onClick={() => openAssistant()}
          aria-label="Open Procurement Assistant"
        >
          <span aria-hidden="true">🤖</span>
          <span className="assistant-fab-label">Ask Assistant</span>
        </button>
      )}

      {open && (
        <div className="assistant-overlay" role="presentation" onClick={() => closeAssistant()}>
          <aside
            className="assistant-drawer"
            role="dialog"
            aria-label="Procurement Assistant"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="assistant-head">
              <div className="assistant-head-id">
                <span className="assistant-avatar" aria-hidden="true">🤖</span>
                <span className="assistant-head-text">
                  <span className="assistant-title">Procurement Assistant</span>
                  <span className="assistant-status">
                    <span className="assistant-dot" aria-hidden="true" /> {connected ? 'Online' : 'Ready to help'}
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="assistant-close"
                onClick={() => closeAssistant()}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {!connected ? (
              <div className="assistant-signin">
                <span className="assistant-signin-icon" aria-hidden="true">🤖</span>
                <p className="assistant-signin-text">
                  Hi{firstName ? ` ${firstName}` : ''}! I'm your Procurement Assistant. Sign in with your
                  Microsoft account to start chatting about requisitions, approvals, and the catalog.
                </p>
                {phase === 'error' && error && <p className="assistant-error">{error}</p>}
                <button
                  type="button"
                  className="assistant-signin-btn"
                  onClick={() => void handleConnect()}
                  disabled={phase === 'connecting'}
                >
                  {phase === 'connecting' ? 'Signing in…' : '🔒 Sign in to start'}
                </button>
                <details className="assistant-setup">
                  <summary>Admin setup</summary>
                  <p>Register this exact redirect URI (SPA) in the app registration:</p>
                  <code className="assistant-setup-uri">{getRedirectUri()}</code>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => void navigator.clipboard?.writeText(getRedirectUri())}
                  >
                    Copy
                  </button>
                </details>
              </div>
            ) : (
              <>
                <div className="assistant-messages" ref={scrollRef}>
                  {messages.map((msg) => (
                    <div key={msg.id}>
                      <div className={`assistant-msg ${msg.role}`}>
                        {msg.role === 'assistant' && (
                          <span className="assistant-msg-avatar" aria-hidden="true">🤖</span>
                        )}
                        <div className="assistant-bubble">{msg.text}</div>
                      </div>
                      {msg.role === 'assistant' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="assistant-suggestions">
                          {msg.suggestedActions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              className="assistant-chip"
                              onClick={() => void handleSend(action)}
                              disabled={busy}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {busy && (
                    <div className="assistant-msg assistant">
                      <span className="assistant-msg-avatar" aria-hidden="true">🤖</span>
                      <div className="assistant-bubble">
                        <span className="assistant-typing" aria-label="Assistant is typing">
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                    </div>
                  )}

                  {error && <p className="assistant-error">{error}</p>}
                </div>

                <div className="assistant-composer">
                  <textarea
                    className="assistant-input"
                    placeholder="Ask the assistant…"
                    value={input}
                    rows={1}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                  />
                  <button
                    type="button"
                    className="assistant-send"
                    onClick={() => void handleSend(input)}
                    disabled={busy || input.trim().length === 0}
                    aria-label="Send"
                  >
                    ➤
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
