/**
 * Centralized Event System for Data Synchronization
 * Ensures all components stay in sync when data changes
 */

type EventHandler = () => void;
type DataChangedHandler = (dataType: 'transactions' | 'hotspots' | 'garage' | 'shift' | 'financials') => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private dataListeners: Set<DataChangedHandler> = new Set();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: string): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler());
    }
  }

  // Helper for data change notifications
  onDataChange(handler: DataChangedHandler): void {
    this.dataListeners.add(handler);
  }

  removeDataChangeListener(handler: DataChangedHandler): void {
    this.dataListeners.delete(handler);
  }

  notifyDataChanged(dataType: 'transactions' | 'hotspots' | 'garage' | 'shift' | 'financials'): void {
    this.dataListeners.forEach(handler => handler(dataType));
    // Also emit general refresh event
    this.emit('data:refresh');
  }
}

export const eventBus = new EventBus();

// Event names for type safety
export const EVENTS = {
  TRANSACTION_ADDED: 'transaction:added',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  HOTSPOT_ADDED: 'hotspot:added',
  HOTSPOT_VALIDATED: 'hotspot:validated',
  SHIFT_STARTED: 'shift:started',
  SHIFT_UPDATED: 'shift:updated',
  SHIFT_ENDED: 'shift:ended',
  REST_MODE_TOGGLED: 'rest:toggled',
  DATA_REFRESH: 'data:refresh'
} as const;

export type EventName = keyof typeof EVENTS;
