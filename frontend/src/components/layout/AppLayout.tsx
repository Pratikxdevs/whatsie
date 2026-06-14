import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { AiKeyMissingBanner } from "../ui/AiKeyMissingBanner";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />
      <AiKeyMissingBanner />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
