// An LRU cache with O(1) get and put, built from a hash map over a doubly-linked
// list. This is the cache node in the architecture studio: hits are served from
// here, misses fall through to the service behind it.

interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

export class LRUCache<K, V> {
  private map = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null; // most recently used
  private tail: Node<K, V> | null = null; // least recently used
  private hits = 0;
  private misses = 0;

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new Error("capacity must be >= 1");
  }

  get stats() {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total ? this.hits / total : 0, size: this.map.size };
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    this.moveToFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }
    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToFront(node);
    if (this.map.size > this.capacity) this.evict();
  }

  private addToFront(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private moveToFront(node: Node<K, V>): void {
    if (node === this.head) return;
    this.detach(node);
    this.addToFront(node);
  }

  private detach(node: Node<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;
    node.prev = node.next = null;
  }

  private evict(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.detach(this.tail);
  }
}
