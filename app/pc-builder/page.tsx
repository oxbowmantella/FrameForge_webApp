// app/pc-builder/page.tsx
export default function PCBuilderPage() {
  return (
    <div className="h-full flex flex-col justify-center items-center text-center">
      <h3 className="text-2xl font-semibold mb-4">Welcome to PC Builder</h3>
      <p className="text-muted-foreground max-w-md">
        Start by selecting a component category to begin building your dream PC.
        Our AI will guide you through each step of the process.
      </p>
    </div>
  );
}
