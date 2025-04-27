import { useAppContext } from "@/context/AppContext";

export function LoadingScreen() {
  const { isLoading } = useAppContext();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 relative mb-4">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center scale-110 animate-pulse">
              <i className="ri-water-drop-fill text-primary text-2xl"></i>
            </div>
          </div>
          <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-foreground text-base font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
