import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SOCKET_URL } from '$env/static/private';

export const load: PageServerLoad = async () => {
	const id = await fetch(SOCKET_URL, {
		method: 'POST',
	});
	if (!id.ok) {
		error(500, await id.text());
	}
	const json = await id.json<{ id: string }>();
	redirect(307, `/wheel/${json.id}`);
};
