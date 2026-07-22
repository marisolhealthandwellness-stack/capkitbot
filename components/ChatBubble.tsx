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
        className={`max-w-[80%] whitespace-pre-wrap px-4 py-2 text-[15px] leading-snug ${
          isUser
            ? "rounded-tl-2xl rounded-tr-md rounded-bl-2xl rounded-br-2xl bg-mint text-plum"
            : "rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-claret text-bone"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
