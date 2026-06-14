/**
 * Error Recovery Handler — Frontend
 *
 * Maps every backend error code to a concrete UI action.
 * Called automatically from the API interceptor on every 4xx/5xx error.
 *
 * Recovery triggers:
 *   redirect_login       → navigate to /login
 *   open_qr_modal        → emit custom event to open QR modal for a bot
 *   open_settings_ai     → navigate to /settings?tab=ai-keys
 *   open_health_dashboard → open 9222 debug dashboard in new tab
 *   retry_request        → call the original request again
 *   navigate_back        → history.back()
 *   refresh_page         → window.location.reload()
 *   countdown_retry      → show countdown toast then retry
 *   delete_and_recreate  → emit delete + add bot event
 *   retry_send_message   → emit retry send event
 */

import { toast } from 'sonner';

export interface RecoveryAction {
  action: string;
  hint: string;
  cta?: {
    label: string;
    route?: string;
    trigger?: string;
  };
  severity: 'info' | 'warn' | 'error' | 'fatal';
}

export interface ErrorContext {
  botId?: string;
  conversationId?: string;
  retryFn?: () => Promise<unknown>;
  onDeleteAndRecreate?: () => void;
}

class ErrorRecoveryHandler {
  private countdownTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Handle a backend error code with optional context.
   * Dispatches the correct recovery action UI.
   */
  handle(code: string, recovery: RecoveryAction | null, ctx: ErrorContext = {}): void {
    if (!recovery) return;

    const trigger = recovery.cta?.trigger;
    const route = recovery.cta?.route;

    switch (trigger) {
      case 'open_settings_ai':
        this.showRecoveryToast(code, recovery, () => {
          window.location.href = '/settings?tab=ai-keys';
        });
        break;

      case 'open_qr_modal':
        this.showRecoveryToast(code, recovery, () => {
          if (ctx.botId) {
            window.dispatchEvent(new CustomEvent('recovery:open_qr_modal', { detail: { botId: ctx.botId } }));
          }
        });
        break;

      case 'retry_qr':
        this.showRecoveryToast(code, recovery, () => {
          if (ctx.botId) {
            window.dispatchEvent(new CustomEvent('recovery:retry_qr', { detail: { botId: ctx.botId } }));
          }
        });
        break;

      case 'delete_and_recreate_bot':
        this.showRecoveryToast(code, recovery, () => {
          if (ctx.onDeleteAndRecreate) ctx.onDeleteAndRecreate();
        });
        break;

      case 'retry_send_message':
        this.showRecoveryToast(code, recovery, () => {
          if (ctx.retryFn) ctx.retryFn().catch(() => {});
        });
        break;

      case 'retry_request':
        this.showRecoveryToast(code, recovery, ctx.retryFn ? () => {
          ctx.retryFn!().catch(() => {});
        } : undefined);
        break;

      case 'open_health_dashboard': {
        const debugUrl = `${window.location.protocol}//${window.location.hostname}:9222`;
        this.showRecoveryToast(code, recovery, () => {
          window.open(debugUrl, '_blank', 'noopener');
        });
        break;
      }

      case 'refresh_page':
        this.showRecoveryToast(code, recovery, () => {
          window.location.reload();
        });
        break;

      case 'navigate_back':
        this.showRecoveryToast(code, recovery, () => {
          window.history.back();
        });
        break;

      case 'countdown_retry':
        this.showCountdownToast(code, recovery, 30, ctx.retryFn);
        break;

      default:
        // No trigger — check if there's a route redirect
        if (route === '/login') {
          this.showRecoveryToast(code, recovery, () => {
            window.location.href = '/login';
          });
        } else if (route) {
          this.showRecoveryToast(code, recovery, () => {
            window.location.href = route;
          });
        } else {
          // No action — just show the toast with the hint
          this.showInfoToast(code, recovery);
        }
    }
  }

  /**
   * Show a recovery toast with an optional CTA button.
   */
  private showRecoveryToast(
    code: string,
    recovery: RecoveryAction,
    onAction?: () => void
  ): void {
    const toastFn =
      recovery.severity === 'fatal' || recovery.severity === 'error'
        ? toast.error
        : recovery.severity === 'warn'
        ? toast.warning
        : toast.info;

    toastFn(`${recovery.action}`, {
      description: recovery.hint,
      duration: recovery.severity === 'fatal' ? Infinity : 8000,
      action: onAction && recovery.cta
        ? { label: recovery.cta.label, onClick: onAction }
        : undefined,
    });
  }

  /**
   * Show a plain info toast (no action).
   */
  private showInfoToast(code: string, recovery: RecoveryAction): void {
    const toastFn =
      recovery.severity === 'fatal' || recovery.severity === 'error'
        ? toast.error
        : recovery.severity === 'warn'
        ? toast.warning
        : toast.info;

    toastFn(`${recovery.action}`, {
      description: recovery.hint,
      duration: 6000,
    });
  }

  /**
   * Show a countdown toast. After countdown, execute the retry function.
   */
  private showCountdownToast(
    code: string,
    recovery: RecoveryAction,
    seconds: number,
    retryFn?: () => Promise<unknown>
  ): void {
    let remaining = seconds;
    const toastId = `countdown-${code}-${Date.now()}`;

    const update = () => {
      if (remaining <= 0) {
        toast.dismiss(toastId);
        if (retryFn) retryFn().catch(() => {});
        return;
      }
      toast.warning(`Rate limited — retrying in ${remaining}s`, {
        id: toastId,
        description: recovery.hint,
        duration: Infinity,
      });
      remaining--;
      this.countdownTimers.set(toastId, setTimeout(update, 1000));
    };

    update();
  }

  /**
   * Handle an enriched error response object from the backend.
   * This is the main entry point called by the API interceptor.
   */
  handleEnrichedError(errorData: any, ctx: ErrorContext = {}): void {
    const code = errorData?.code;
    const recovery = errorData?.recovery as RecoveryAction | null;

    if (!code || !recovery) return;
    this.handle(code, recovery, ctx);
  }
}

export const errorRecovery = new ErrorRecoveryHandler();
