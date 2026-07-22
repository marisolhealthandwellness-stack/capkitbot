export function ChatBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] leading-snug ${
          isUser ? "bg-bubbleUser text-white" : "bg-bubbleBot text-black"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
