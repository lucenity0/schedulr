import { describe, expect, it } from 'vitest';
import {
  canSwitch,
  checkAccess,
  defaultAccessMatrix,
  initialIpc,
  ipcReceive,
  ipcSend,
  processTransitions
} from './ipc';

describe('shared memory', () => {
  it('crosses into the kernel only to set the region up', () => {
    let state = initialIpc('shared-memory');
    expect(state.kernelCrossings).toBe(2);

    state = ipcSend(state, 'hello');
    state = ipcReceive(state);
    // Reads and writes are plain memory accesses - no further system calls.
    expect(state.kernelCrossings).toBe(2);
  });

  it('moves data through the shared region', () => {
    let state = initialIpc('shared-memory');
    state = ipcSend(state, 'hello');
    expect(state.sharedRegion[0]).toBe('hello');
    state = ipcReceive(state);
    expect(state.sharedRegion[0]).toBeNull();
  });
});

describe('message passing', () => {
  it('costs a system call on every send and receive', () => {
    let state = initialIpc('message-passing');
    state = ipcSend(state, 'a');
    expect(state.kernelCrossings).toBe(1);
    state = ipcReceive(state);
    expect(state.kernelCrossings).toBe(2);
    expect(state.delivered).toHaveLength(1);
  });

  it('blocks the sender when the channel is full', () => {
    let state = initialIpc('message-passing', 2);
    state = ipcSend(state, 'a');
    state = ipcSend(state, 'b');
    expect(state.queue).toHaveLength(2);

    state = ipcSend(state, 'c');
    expect(state.senderBlocked).toBe(true);
    expect(state.queue).toHaveLength(2);
  });

  it('blocks the receiver on an empty channel', () => {
    const state = ipcReceive(initialIpc('message-passing'));
    expect(state.receiverBlocked).toBe(true);
    expect(state.delivered).toHaveLength(0);
  });

  it('treats a zero-capacity channel as a rendezvous', () => {
    let state = initialIpc('message-passing', 0);
    state = ipcSend(state, 'a');
    expect(state.senderBlocked).toBe(true);
    state = ipcReceive(state);
    expect(state.senderBlocked).toBe(false);
  });

  it('delivers messages in order', () => {
    let state = initialIpc('message-passing', 5);
    ['a', 'b', 'c'].forEach(body => {
      state = ipcSend(state, body);
    });
    ['a', 'b', 'c'].forEach(() => {
      state = ipcReceive(state);
    });
    expect(state.delivered.map(m => m.body)).toEqual(['a', 'b', 'c']);
  });
});

describe('process states', () => {
  it('sends a waiting process back to ready, not straight to running', () => {
    const transition = processTransitions.find(t => t.from === 'waiting')!;
    expect(transition.to).toBe('ready');
    expect(transition.detail).toContain('scheduled again');
  });

  it('covers every state in the five-state model', () => {
    const states = new Set(processTransitions.flatMap(t => [t.from, t.to]));
    expect([...states].sort()).toEqual(['new', 'ready', 'running', 'terminated', 'waiting']);
  });

  it('distinguishes preemption from blocking', () => {
    const preempt = processTransitions.find(t => t.from === 'running' && t.to === 'ready')!;
    const block = processTransitions.find(t => t.from === 'running' && t.to === 'waiting')!;
    expect(preempt.trigger).toContain('quantum');
    expect(block.trigger).toContain('I/O');
  });
});

describe('access matrix', () => {
  const matrix = defaultAccessMatrix();

  it('allows an access the domain holds the right for', () => {
    const result = checkAccess(matrix, 0, 0, 'read');
    expect(result.allowed).toBe(true);
  });

  it('denies an access the domain does not hold', () => {
    const result = checkAccess(matrix, 0, 0, 'write');
    expect(result.allowed).toBe(false);
    expect(result.narration).toContain('least privilege');
  });

  it('denies access to an object the domain has no rights on at all', () => {
    expect(checkAccess(matrix, 0, 2, 'write').allowed).toBe(false);
  });

  it('permits a domain switch only where the switch right exists', () => {
    // D1 may switch to D2, but not to D3.
    expect(canSwitch(matrix, 0, 1)).toBe(true);
    expect(canSwitch(matrix, 0, 2)).toBe(false);
    // D2 may switch to D3.
    expect(canSwitch(matrix, 1, 2)).toBe(true);
  });

  it('records ownership separately from read and write', () => {
    expect(checkAccess(matrix, 1, 1, 'owner').allowed).toBe(true);
    expect(checkAccess(matrix, 2, 1, 'owner').allowed).toBe(false);
    expect(checkAccess(matrix, 2, 1, 'read').allowed).toBe(true);
  });
});
