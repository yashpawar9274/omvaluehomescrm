import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-100 backdrop-blur-md shadow-lg">
        <WifiOff className="h-3.5 w-3.5" />
        Offline — kuch features unavailable
      </div>
    </div>
  );
}