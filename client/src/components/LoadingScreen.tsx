import { useAppContext } from "@/context/AppContext";

export function LoadingScreen() {
  const { isLoading } = useAppContext();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background bg-opacity-90 z-50 flex flex-col items-center justify-center">
      <div className="w-20 h-20 relative">
        <div className="absolute inset-0 border-4 border-primary border-t-primary-foreground rounded-full animate-spin"></div>
      </div>
      <p className="text-accent mt-6 text-lg">Just a moment...</p>
    </div>
  );
}
