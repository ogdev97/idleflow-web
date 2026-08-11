/**
 * Tiny bus so components outside the Copilot (e.g. the Top Yields card in the aside)
 * can hand it a prompt. The Copilot registers a handler on mount; callers `ask()`.
 */
type Handler = (prompt: string) => void;

let handler: Handler | null = null;

export const copilotBus = {
  setHandler(h: Handler | null) {
    handler = h;
  },
  ask(prompt: string) {
    handler?.(prompt);
  },
};
