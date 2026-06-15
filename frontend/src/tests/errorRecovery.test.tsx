// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorRecovery } from '../services/errorRecovery';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }
}));

describe('ErrorRecoveryHandler', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '', reload: vi.fn() } as any;

    // Mock window.dispatchEvent
    window.dispatchEvent = vi.fn();

    // Mock window.open
    window.open = vi.fn();
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('should handle open_settings_ai trigger', () => {
    errorRecovery.handleEnrichedError({
      code: 'SYS_005',
      recovery: {
        action: 'Configure AI',
        hint: 'Please configure your AI engine',
        severity: 'warn',
        cta: { label: 'Go to Settings', trigger: 'open_settings_ai' }
      }
    });

    expect(toast.warning).toHaveBeenCalledWith('Configure AI', expect.objectContaining({
      description: 'Please configure your AI engine',
    }));

    // Simulate clicking the toast action
    const mockCall = vi.mocked(toast.warning).mock.calls[0];
    const options = mockCall[1] as any;
    options.action.onClick();

    expect(window.location.href).toBe('/settings?tab=ai-keys');
  });

  it('should handle open_qr_modal trigger', () => {
    errorRecovery.handleEnrichedError({
      code: 'DB_005',
      recovery: {
        action: 'Scan QR Code',
        hint: 'Bot needs to be connected',
        severity: 'info',
        cta: { label: 'Scan Now', trigger: 'open_qr_modal' }
      }
    }, { botId: 'bot-123' });

    const mockCall = vi.mocked(toast.info).mock.calls[0];
    const options = mockCall[1] as any;
    options.action.onClick();

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery:open_qr_modal',
        detail: { botId: 'bot-123' }
      })
    );
  });

  it('should handle retry_request trigger with ctx.retryFn', async () => {
    const retryFn = vi.fn().mockResolvedValue(true);
    
    errorRecovery.handleEnrichedError({
      code: 'NET_001',
      recovery: {
        action: 'Connection Failed',
        hint: 'Try again',
        severity: 'error',
        cta: { label: 'Retry', trigger: 'retry_request' }
      }
    }, { retryFn });

    expect(toast.error).toHaveBeenCalled();
    const mockCall = vi.mocked(toast.error).mock.calls[0];
    const options = mockCall[1] as any;
    options.action.onClick();

    expect(retryFn).toHaveBeenCalled();
  });

  it('should redirect if route is provided without trigger', () => {
    errorRecovery.handleEnrichedError({
      code: 'AUTH_001',
      recovery: {
        action: 'Unauthorized',
        hint: 'Please login',
        severity: 'fatal',
        cta: { label: 'Login', route: '/login' }
      }
    });

    const mockCall = vi.mocked(toast.error).mock.calls[0];
    const options = mockCall[1] as any;
    options.action.onClick();

    expect(window.location.href).toBe('/login');
  });

  it('should show plain info toast if no CTA is provided', () => {
    errorRecovery.handleEnrichedError({
      code: 'VAL_001',
      recovery: {
        action: 'Invalid Input',
        hint: 'Check your data',
        severity: 'info',
      }
    });

    expect(toast.info).toHaveBeenCalledWith('Invalid Input', expect.objectContaining({
      description: 'Check your data'
    }));
  });
});
