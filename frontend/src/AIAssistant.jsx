import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  LoaderCircle,
  MessageCircle,
  Sparkles,
  UserRound
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AIAssistant.css";

const API_URL = "http://localhost:5000/api";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hi! I'm your Knowledgebase AI assistant. Ask me a question, explore an idea, or get help organizing your thoughts. What would you like to talk about?"
};

function AIAssistant() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, loading]);

  async function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please sign in to use the AI assistant.");
      return;
    }

    const history = messages
      .slice(-10)
      .map(({ role, content }) => ({
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
        setError(
          "Your login session may have expired. Please sign in again."
        );
      } else {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to get an AI response. Please try again."
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
  }

  return (
    <main className="ai-assistant">
      <header className="ai-assistant-header">
        <button
          type="button"
          className="ai-assistant-back"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={19} />
        </button>

        <div className="ai-assistant-brand-icon">
          <Bot size={25} />
        </div>

        <div className="ai-assistant-heading">
          <h1>Knowledgebase AI</h1>
          <p>Your personal thinking companion</p>
        </div>

        <button
          type="button"
          className="ai-assistant-new-chat"
          onClick={startNewChat}
          disabled={loading}
        >
          <MessageCircle size={17} />
          <span>New chat</span>
        </button>
      </header>

      <section
        className="ai-assistant-conversation"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div className="ai-assistant-welcome">
          <div className="ai-assistant-welcome-icon">
            <Sparkles size={25} />
          </div>

          <h2>A little intelligence for your ideas.</h2>

          <p>
            Ask questions, brainstorm ideas, or get help understanding a
            topic. We're just getting started!
          </p>
        </div>

        <div className="ai-assistant-messages">
          {messages.map((message, index) => (
            <article
              className={`ai-assistant-message ai-assistant-message-${message.role}`}
              key={`${message.role}-${index}`}
            >
              <div className="ai-assistant-avatar">
                {message.role === "assistant" ? (
                  <Bot size={19} />
                ) : (
                  <UserRound size={19} />
                )}
              </div>

              <div className="ai-assistant-message-content">
                <span className="ai-assistant-sender">
                  {message.role === "assistant" ? "Knowledgebase AI" : "You"}
                </span>

                <div className="ai-assistant-markdown">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </article>
          ))}

          {loading && (
            <article className="ai-assistant-message ai-assistant-message-assistant">
              <div className="ai-assistant-avatar">
                <Bot size={19} />
              </div>

              <div className="ai-assistant-message-content">
                <span className="ai-assistant-sender">Knowledgebase AI</span>

                <p className="ai-assistant-thinking">
                  <LoaderCircle size={17} className="ai-assistant-spinner" />
                  Thinking...
                </p>
              </div>
            </article>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      <footer className="ai-assistant-footer">
        {error && (
          <div className="ai-assistant-error" role="alert">
            {error}
          </div>
        )}

        <form className="ai-assistant-composer" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI assistant something..."
            aria-label="Your message"
            rows={2}
            maxLength={2000}
            disabled={loading}
          />

          <div className="ai-assistant-composer-bottom">
            <span className="ai-assistant-hint">
              Enter to send · Shift + Enter for a new line
            </span>

            <div className="ai-assistant-send-group">
              <span className="ai-assistant-character-count">
                {input.length}/2000
              </span>

              <button
                type="submit"
                className="ai-assistant-send"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                {loading ? (
                  <LoaderCircle
                    size={19}
                    className="ai-assistant-spinner"
                  />
                ) : (
                  <ArrowUp size={20} />
                )}
              </button>
            </div>
          </div>
        </form>

        <p className="ai-assistant-disclaimer">
          AI responses may not always be accurate. Review important information.
        </p>
      </footer>
    </main>
  );
}

export default AIAssistant;