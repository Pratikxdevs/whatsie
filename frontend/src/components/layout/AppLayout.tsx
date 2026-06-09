import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
