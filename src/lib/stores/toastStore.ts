import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
	id: number;
	message: string;
	kind: ToastKind;
	timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 2800;

function createToastStore() {
	const { subscribe, update } = writable<ToastItem[]>([]);
	let nextId = 1;

	function remove(id: number) {
		update((items) => items.filter((item) => item.id !== id));
	}

	function push(message: string, kind: ToastKind = 'info', timeoutMs = DEFAULT_TIMEOUT_MS) {
		const item: ToastItem = {
			id: nextId++,
			message,
			kind,
			timeoutMs
		};

		update((items) => [...items, item]);
		setTimeout(() => remove(item.id), timeoutMs);
	}

	return {
		subscribe,
		push,
		remove,
		success: (message: string, timeoutMs = DEFAULT_TIMEOUT_MS) =>
			push(message, 'success', timeoutMs),
		error: (message: string, timeoutMs = DEFAULT_TIMEOUT_MS) => push(message, 'error', timeoutMs),
		info: (message: string, timeoutMs = DEFAULT_TIMEOUT_MS) => push(message, 'info', timeoutMs)
	};
}

export const toastStore = createToastStore();
