import { getGenUIComponent } from "./GenUIRegistry";

interface GenUIRendererProps {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export default function GenUIRenderer({
  toolName,
  args,
  result,
}: GenUIRendererProps) {
  const Component = getGenUIComponent(toolName);

  // If a custom component is registered, render it
  if (Component) {
    return <Component toolName={toolName} args={args} result={result} />;
  }

  // Fallback: render raw JSON
  return (
    <div className="gen-ui-fallback">
      <pre className="gen-ui-json">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
