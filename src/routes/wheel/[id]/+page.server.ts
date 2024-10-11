import { SOCKET_URL } from '$env/static/private';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
	const initial = await fetch(`${SOCKET_URL}/${event.params.id}`);
	if (!initial.ok) {
		error(initial.status, await initial.text());
	}
	return {
		data: await initial.json<{
			angle: number;
			velocity: number;
			timestamp: number;
			acceleration: number;
			options: string[];
		}>(),
		ws: `${SOCKET_URL.replace(/^http/, 'ws')}/ws/${event.params.id}`,
	};
};
