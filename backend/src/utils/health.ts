import mongoose from 'mongoose';

const STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export function mongoStateName(): string {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}
