import { toast } from 'sonner';
import { errorLog } from '../services/errorLog';

/**
 * Wire the error logger to sonner toasts.
 * Call this once in App.tsx or main.tsx.
 */
export function setupErrorToasts() {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const code = errorLog.classifyError(error);
    const message = error?.message || 'Something went wrong';
    toast.error(`[${code}] ${message}`);
  });
}
