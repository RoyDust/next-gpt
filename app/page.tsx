"use client";
import Image from "next/image";
import f1GptLogo from "./assets/logo.jpg";
import { CreateMessage, useChat } from "@ai-sdk/react";
import { Message } from "ai";
import PromptSuggestionRow from "./components/PromptSuggestionRow";
import LoadingBubble from "./components/LoadingBubble";
import Bubble from "./components/Bubble";

const Home = () => {
  const {
    append,
    isLoading,
    messages,
    input,
    handleInputChange,
    handleSubmit,
  } = useChat();

  const noMessages = !messages || messages.length === 0;

  const onPromptClick = (promptText: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    append(msg as CreateMessage);
  };

  return (
    <main className="main">
      {/* Logo and Header */}
      <div className="chat-header">
        <Image
          src={f1GptLogo}
          width="60"
          height="60"
          alt="F1GPT Logo"
          className="logo"
        />
        <h1 className="app-title">F1GPT</h1>
      </div>
      
      <section className={`chat-container ${noMessages ? "" : "populated"}`}>
        {noMessages ? (
          <div className="welcome-container">
            <p className="starter-text">
              欢迎来到 F1GPT - F1 赛车爱好者的终极问答平台！<br />
              获取最新赛事新闻、车手数据和赛车统计信息。<br />
              向 F1GPT 提问任何关于 F1 赛车的问题，我们将为您提供最新最全的信息。
            </p>
            <PromptSuggestionRow onPromptClick={onPromptClick} />
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </div>
        )}
      </section>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          name="message"
          id="message-input"
          className="question-box"
          onChange={handleInputChange}
          value={input}
          placeholder="输入您的 F1 相关问题..."
        />
        <button type="submit" className="send-button">
          发送
        </button>
      </form>
    </main>
  );
};

export default Home;
