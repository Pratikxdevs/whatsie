/**
 * Socket Manager — Singleton Socket.IO client
 *
 * Ensures only ONE WebSocket connection exists for the entire app lifetime.
 * All components subscribe/unsubscribe to events through this manager.
 *
 * Why: Previously, 5+ components each created their own socket instance.
 * This caused "send was called before connect" (API_005) errors because
 * components emitted events before their own socket handshake completed.
 * This singleton waits for the connect event before any emit is attempted.
 */

import { io, Socket } from 'socket.io-client';
import { getSocketUrl, getSocketAuthToken } from './api';
import { errorLog } from './errorLog';

type Listener = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private tenantId: string | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private connectPromise: Promise<void> | null = null;
  private resolveConnect: (() => void) | null = null;

  /**
   * Initialize the singleton connection for a given tenant.
   * Safe to call multiple times — will no-op if already connected.
   */
  async connect(tenantId: string): Promise<void> {
    // If same tenant already connected, nothing to do
    if (this.socket?.connected && this.tenantId === tenantId) return;

    // If different tenant, disconnect first
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.tenantId = null;
      this.connectPromise = null;
    }

    this.tenantId = tenantId;

    // Build a promise that resolves when socket connects
    this.connectPromise = new Promise((resolve) => {
      this.resolveConnect = resolve;
    });

    this.socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        getSocketAuthToken().then(token => {
          cb({ token });
        }).catch(() => {
          cb({ token: null });
        });
      },
    });

    this.socket.on('connect', () => {
      // Server auto-joins the tenant room on connect (index.ts socket.join(tenantId))
      // No manual join_tenant needed — avoids tenant-id mismatch warnings
      errorLog.activityLog(`[FRONTEND] ↳ WebSocket connected — tenant:${tenantId?.slice(0, 8)}`, { category: 'frontend', event: 'ws_connect', tenantId });
      this.resolveConnect?.();
    });

    this.socket.on('disconnect', () => {
      // Reset connect promise on disconnect so future emits wait for reconnect
      errorLog.activityLog('[FRONTEND] ← WebSocket disconnected', { category: 'frontend', event: 'ws_disconnect' });
      this.connectPromise = new Promise((resolve) => {
        this.resolveConnect = resolve;
      });
    });

    this.socket.on('reconnect', () => {
      // Server re-joins tenant room on reconnect automatically
      errorLog.activityLog('[FRONTEND] ↻ WebSocket reconnected', { category: 'frontend', event: 'ws_reconnect' });
      this.resolveConnect?.();
    });

    this.socket.on('connect_error', (err: Error) => {
      errorLog.activityLog(`[FRONTEND] ✗ WebSocket connection error — ${err.message}`, { category: 'frontend', event: 'ws_error', error: err.message });
    });

    // Replay any cached listeners onto the new socket
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket!.on(event, handler);
      });
    });
  }

  /**
   * Subscribe to a socket event. Safe to call before connect() — the
   * listener will be attached when the socket is ready.
   */
  on(event: string, handler: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Attach to live socket if already exists
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Unsubscribe a specific handler from an event.
   */
  off(event: string, handler: Listener): void {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  /**
   * Emit an event. Waits for the socket to be connected first.
   */
  async emit(event: string, ...args: any[]): Promise<void> {
    if (this.connectPromise) await this.connectPromise;
    errorLog.activityLog(`[FRONTEND] ⇧ Socket emit: ${event}`, { category: 'frontend', event: 'ws_emit', socketEvent: event });
    this.socket?.emit(event, ...args);
  }

  /**
   * Disconnect the socket entirely (e.g. on logout).
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.tenantId = null;
    this.connectPromise = null;
    this.resolveConnect = null;
    this.listeners.clear();
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export a single global instance
export const socketManager = new SocketManager();
