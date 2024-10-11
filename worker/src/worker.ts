import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { ServerToClient, clientToServerSchema, predict_angle } from 'common';

type SpinStatus = {
	angle: number;
	velocity: number;
	timestamp: number;
	acceleration: number;
};

export class SocketObject extends DurableObject {
	sql: SqlStorage;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		this.sql.exec(`CREATE TABLE IF NOT EXISTS options (
			id INTEGER PRIMARY KEY,
      option  TEXT
    );
		CREATE TABLE IF NOT EXISTS status (
			id INTEGER PRIMARY KEY,
			angle REAL,
			velocity REAL,
			acceleration REAL,
			timestamp INTEGER
		);
		INSERT OR IGNORE INTO status(id, angle, velocity, acceleration, timestamp) VALUES(1, 0, 0, -800, ${Date.now()});`);
	}

	webSocketMessage(
		_ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> {
		if (typeof message !== 'string') return;
		const parsed = clientToServerSchema.safeParse(JSON.parse(message));
		if (!parsed.success) return;
		if (parsed.data.type === 'options') {
			const questions = new Array(parsed.data.options.length)
				.fill('')
				.map((_, i) => `(${i + 1}, ?)`)
				.join(',');
			this.sql.exec(
				`DELETE FROM options; INSERT INTO options(id, option) VALUES ${questions};`,
				...parsed.data.options,
			);

			const message = JSON.stringify({
				type: 'options',
				options: parsed.data.options,
			} as ServerToClient);
			for (const ws of this.ctx.getWebSockets()) {
				ws.send(message);
			}
		} else if (parsed.data.type === 'spin') {
			const angle = Math.random() * 360;
			const velocity = 2000;
			const acceleration = -800;
			const timestamp = Date.now();
			this.sql.exec(
				`UPDATE status SET angle = ?, velocity = ?, acceleration = ?, timestamp = ? WHERE id = 1;`,
				angle,
				velocity,
				acceleration,
				timestamp,
			);
			const message = JSON.stringify({
				type: 'spin',
				angle,
				velocity,
				acceleration,
				timestamp,
			} as ServerToClient);
			for (const ws of this.ctx.getWebSockets()) {
				ws.send(message);
			}
		} else if (parsed.data.type === 'stop') {
			const spin = this.sql
				.exec('SELECT angle, velocity, timestamp FROM status WHERE id = 1;')
				.one() as SpinStatus;
			const now = Date.now();

			const current_angle = predict_angle(spin, now);

			this.sql.exec(
				`UPDATE status SET angle = ?, velocity = 0, acceleration = -800, timestamp = ? WHERE id = 1;`,
				current_angle,
				now,
			);
			const message = JSON.stringify({
				type: 'spin',
				angle: current_angle,
				velocity: 0,
				acceleration: -800,
				timestamp: now,
			} as ServerToClient);
			for (const ws of this.ctx.getWebSockets()) {
				ws.send(message);
			}
		}
	}

	async fetch(_req: Request): Promise<Response> {
		const { 0: client, 1: server } = new WebSocketPair();

		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async status() {
		const row = this.sql
			.exec(
				'SELECT angle, velocity, acceleration, timestamp FROM status WHERE id = 1;',
			)
			.one() as SpinStatus;
		const options = this.sql
			.exec('SELECT option FROM options;')
			.toArray()
			.map((r) => r.option as string);
		return { ...row, options };
	}
}

const app = new Hono<{ Bindings: Env }>();

app.post('/', (c) => {
	const id = c.env.SOCKET_OBJECT.newUniqueId();
	return c.json({ id: id.toString() });
});

app.get('/:id', async (c) => {
	const id = c.env.SOCKET_OBJECT.idFromString(c.req.param('id'));
	const socket = c.env.SOCKET_OBJECT.get(id);
	return c.json(await socket.status());
});

app.get('/ws/:id', (c) => {
	const upgrade = c.req.header('Upgrade');
	if (upgrade !== 'websocket') {
		c.status(426);
		return c.body('WebSocket connection required');
	}
	const id = c.env.SOCKET_OBJECT.idFromString(c.req.param('id'));
	const socket = c.env.SOCKET_OBJECT.get(id);
	return socket.fetch(c.req.raw);
});

export default app;
