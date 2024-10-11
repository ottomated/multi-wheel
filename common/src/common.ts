import { z } from 'zod';

export const clientToServerSchema = z
	.object({
		type: z.literal('options'),
		options: z.array(z.string()),
	})
	.or(z.object({ type: z.literal('spin') }))
	.or(z.object({ type: z.literal('stop') }));

export type ClientToServer = z.infer<typeof clientToServerSchema>;

export type ServerToClient =
	| {
			type: 'spin';
			angle: number;
			velocity: number;
			acceleration: number;
			timestamp: number;
	  }
	| {
			type: 'options';
			options: string[];
	  };

export function predict_angle(
	spin: {
		angle: number;
		velocity: number;
		timestamp: number;
		acceleration: number;
	},
	now: number,
) {
	const t = (now - spin.timestamp) / 1000;

	const timeToStop = Math.abs(spin.velocity / spin.acceleration);

	const effectiveTime = Math.min(t, timeToStop);
	const final =
		spin.angle +
		spin.velocity * effectiveTime +
		0.5 * spin.acceleration * effectiveTime * effectiveTime;
	return final % 360;
}
