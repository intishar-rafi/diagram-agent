interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
}

export default function StreamingText({
  text,
  isStreaming = false,
}: StreamingTextProps) {
  return (
    <span className="streaming-text">
      {text}
      {isStreaming && <span className="streaming-cursor">|</span>}
    </span>
  );
}
