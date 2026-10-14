import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Bot,
  ExternalLink,
  LoaderCircle,
  Maximize2,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./FloatingAIAssistant.css";

const API_URL = "http://localhost:5000/api";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hi! I'm your Knowledgebase AI assistant. Ask me questions, explore your ideas, or discover information in your saved notes. How can I help you today?"
};

function FloatingAIAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isVisible =
    Boolean(localStorage.getItem("token")) &&
    location.pathname === "/dashboard";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please sign in to use your AI assistant.");
      return;
    }

    const history = messages.slice(-10).map(({ role, content }) => ({
      role,
      content
    }));

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: message
      }
    ]);

    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/ai-chat`,
        {
          message,
          history
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 60000
        }
      );

      const reply = response.data?.reply;

      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.trim()
        }
      ]);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError("Your login session may have expired. Please sign in again.");
      } else {
        setError(
          requestError.response?.data?.message ||
            "Unable to get a response. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function startNewChat() {
    if (loading) {
      return;
    }

    setMessages([welcomeMessage]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  }

  function openFullAssistant() {
    setIsOpen(false);
    navigate("/ai-assistant");
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pkb-ai-widget">
      {isOpen && (
        <section
          className="pkb-ai-widget-panel"
          aria-label="Knowledgebase AI chat"
        >
          <header className="pkb-ai-widget-header">
            <div className="pkb-ai-widget-brand">
              <div className="pkb-ai-widget-brand-icon">
                <Bot size={23} />
                <span className="pkb-ai-widget-online" />
              </div>

              <div className="pkb-ai-widget-brand-text">
                <h2>Knowledgebase AI</h2>
                <p>
                  <span className="pkb-ai-widget-status-dot" />
                  Your personal AI assistant
                </p>
              </div>
            </div>

            <div className="pkb-ai-widget-header-actions">
              <button
                type="button"
                onClick={startNewChat}
                disabled={loading}
                aria-label="Start a new chat"
                title="New chat"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                onClick={openFullAssistant}
                aria-label="Open full-page assistant"
                title="Open full-page assistant"
              >
                <Maximize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI assistant"
                title="Close chat"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="pkb-ai-widget-welcome">
            <div className="pkb-ai-widget-welcome-icon">
              <Sparkles size={20} />
            </div>

            <h3>Your ideas, with a little intelligence.</h3>

            <p>
              Ask a question or explore something you've saved in your
              Knowledgebase.
            </p>
          </div>

          <div
            className="pkb-ai-widget-messages"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message, index) => (
              <article
                className={`pkb-ai-widget-message pkb-ai-widget-message-${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" && (
                  <div className="pkb-ai-widget-message-avatar">
                    <Bot size={16} />
                  </div>
                )}

                <div className="pkb-ai-widget-message-body">
                  <div className="pkb-ai-widget-message-content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              </article>
            ))}

            {loading && (
              <article className="pkb-ai-widget-message pkb-ai-widget-message-assistant">
                <div className="pkb-ai-widget-message-avatar">
                  <Bot size={16} />
                </div>

                <div className="pkb-ai-widget-thinking">
                  <LoaderCircle
                    size={16}
                    className="pkb-ai-widget-spinner"
                  />
                  Thinking...
                </div>
              </article>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="pkb-ai-widget-composer-area">
            {error && (
              <div className="pkb-ai-widget-error" role="alert">
                {error}
              </div>
            )}

            <form
              className="pkb-ai-widget-composer"
              onSubmit={handleSubmit}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                aria-label="Message to Knowledgebase AI"
                maxLength={2000}
                rows={2}
                disabled={loading}
              />

              <div className="pkb-ai-widget-composer-bottom">
                <span>AI assistant</span>

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  title="Send message"
                >
                  {loading ? (
                    <LoaderCircle
                      size={18}
                      className="pkb-ai-widget-spinner"
                    />
                  ) : (
                    <ArrowUp size={19} />
                  )}
                </button>
              </div>
            </form>

            <p className="pkb-ai-widget-disclaimer">
              AI can make mistakes. Check important information.
            </p>
          </div>
        </section>
      )}

      <button
  type="button"
  className={`pkb-ai-widget-launcher ${isOpen ? "pkb-ai-widget-launcher-open" : ""}`}
  onClick={() => setIsOpen((current) => !current)}
  aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
  aria-expanded={isOpen}
  title={isOpen ? "Close AI assistant" : "Chat with Knowledgebase AI"}
>
  {isOpen ? <X size={25} /> : <MessageCircle size={25} />}
</button>
    </div>
  );
}

export default FloatingAIAssistant;