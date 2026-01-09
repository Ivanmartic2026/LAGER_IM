// Background sync queue for pending operations
const QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

class SyncQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isProcessing = false;
    
    // Listen for online status
    window.addEventListener('online', () => this.processQueue());
  }

  loadQueue() {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  // Add operation to queue
  add(operation) {
    const item = {
      id: Date.now() + Math.random(),
      ...operation,
      retries: 0,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    this.queue.push(item);
    this.saveQueue();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return item.id;
  }

  // Process queue
  async processQueue() {
    if (this.isProcessing || !navigator.onLine) return;
    
    this.isProcessing = true;
    const pending = this.queue.filter(item => 
      item.status === 'pending' && item.retries < MAX_RETRIES
    );

    for (const item of pending) {
      try {
        await this.executeOperation(item);
        item.status = 'completed';
        this.remove(item.id);
      } catch (error) {
        console.error('Sync failed:', error);
        item.retries++;
        item.lastError = error.message;
        item.status = item.retries >= MAX_RETRIES ? 'failed' : 'pending';
      }
    }

    this.saveQueue();
    this.isProcessing = false;
  }

  async executeOperation(item) {
    const { type, entityName, method, data } = item;
    
    if (type === 'entity') {
      const { base44 } = await import('@/api/base44Client');
      
      switch (method) {
        case 'create':
          await base44.entities[entityName].create(data);
          break;
        case 'update':
          await base44.entities[entityName].update(data.id, data);
          break;
        case 'delete':
          await base44.entities[entityName].delete(data.id);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } else if (type === 'function') {
      const { base44 } = await import('@/api/base44Client');
      await base44.functions.invoke(item.functionName, item.params);
    }
  }

  // Remove item from queue
  remove(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveQueue();
  }

  // Get queue status
  getStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      completed: this.queue.filter(i => i.status === 'completed').length
    };
  }

  // Clear completed items
  clearCompleted() {
    this.queue = this.queue.filter(i => i.status !== 'completed');
    this.saveQueue();
  }

  // Clear all
  clearAll() {
    this.queue = [];
    this.saveQueue();
  }

  // Get pending items
  getPending() {
    return this.queue.filter(i => i.status === 'pending');
  }
}

export const syncQueue = new SyncQueue();