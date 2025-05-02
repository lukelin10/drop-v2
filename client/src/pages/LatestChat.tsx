import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { LoadingScreen } from "@/components/LoadingScreen";

function LatestChat() {
  const [, navigate] = useLocation();
  const { getLatestDropId } = useDrops();
  const { setLoading } = useAppContext();
  
  useEffect(() => {
    // Find the latest drop ID and redirect to it
    const latestDropId = getLatestDropId();
    
    if (latestDropId) {
      navigate(`/chat/${latestDropId}`);
    } else {
      // If no drops exist, go back to home
      setLoading(false);
      navigate("/");
    }
  }, [getLatestDropId, navigate, setLoading]);
  
  // Show loading screen while redirecting
  return <LoadingScreen />;
}

export default LatestChat;