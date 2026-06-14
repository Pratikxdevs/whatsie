import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-6 font-sans">
      <div className="text-center">
        <p className="text-8xl font-bold text-zinc-800 leading-none select-none">404</p>
        <h1 className="text-2xl font-semibold text-zinc-100 mt-4">Page not found</h1>
        <p className="text-zinc-500 mt-2 text-sm max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
}
