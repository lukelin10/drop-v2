import { useAppContext } from "@/context/AppContext";

export function LoadingScreen() {
  const { isLoading } = useAppContext();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin">
          <i className="ri-loader-4-line text-4xl text-primary"></i>
        </div>
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
}