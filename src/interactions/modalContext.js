const modalContexts = new Map();
const ttlMs = 15 * 60 * 1000;

export function createModalContext(value) {
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  modalContexts.set(token, value);

  const timeout = setTimeout(() => {
    modalContexts.delete(token);
  }, ttlMs);
  timeout.unref?.();

  return token;
}

export function consumeModalContext(token) {
  const value = modalContexts.get(token);
  modalContexts.delete(token);
  return value ?? null;
}
