<script lang="ts">
	import {
		predict_angle,
		type ClientToServer,
		type ServerToClient,
	} from 'common';
	import { WebSocket as RWS } from 'partysocket';
	import { Pencil, Plus, Trash2, X } from '@o7/icon';

	const { data } = $props();

	const spin = $state(data.data);

	let angle = $state(predict_angle(spin, Date.now()));

	$effect(() => {
		const tick = () => {
			raf = requestAnimationFrame(tick);
			angle = predict_angle(spin, Date.now());
		};
		let raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
		};
	});

	let ws: RWS;

	$effect(() => {
		ws = new RWS(data.ws);

		ws.addEventListener('message', (event) => {
			const msg = JSON.parse(event.data) as ServerToClient;
			if (msg.type === 'spin') {
				console.log('[SPIN]', Date.now(), msg.timestamp);
				spin.angle = msg.angle;
				spin.velocity = msg.velocity;
				spin.timestamp = msg.timestamp;
			} else if (msg.type === 'options') {
				spin.options = msg.options;
			}
		});
	});

	function send(msg: ClientToServer) {
		ws.send(JSON.stringify(msg));
	}

	let dialog = $state<HTMLDialogElement>();

	const lineAngle = $derived.by(() => {
		const a = (Math.PI * 2 * -0.5) / spin.options.length;
		return [Math.cos(a) * 240 + 250, Math.sin(a) * 240 + 250];
	});
</script>

<main class="flex flex-col min-h-dvh w-full justify-center gap-4 items-center">
	<svg viewBox="0 0 500 500" class="size-96">
		<path d="M250,10 L260,0 L240,0 Z" fill="white" />
		<circle cx="250" cy="250" r="240" fill="none" stroke="white" />
		<g style:transform="rotate({angle}deg)" class="origin-center">
			{#each spin.options as option, i}
				{@const angle = (i * 360) / spin.options.length}
				<g style:transform="rotate({angle}deg)" class="origin-center">
					<line
						x1="250"
						y1="250"
						x2={lineAngle[0]}
						y2={lineAngle[1]}
						stroke="white"
						stroke-width="2"
					/>
					<text
						x={250 + 240 / 2}
						y="250"
						class="fill-white text-lg font-bold"
						dominant-baseline="middle"
						text-anchor="middle">{option}</text
					>
				</g>
			{/each}
		</g>
	</svg>
	<!-- <div class="size-96 rounded-full bg-black relative shadow-lg">
		<div
			class="w-1 h-48 bg-white absolute top-1/2 left-1/2 origin-top"
			style:transform="rotate({angle}deg)"
		></div>
	</div> -->
	<div class="flex gap-2 items-center">
		<div class="size-8"></div>
		<button
			onclick={() => send({ type: 'spin' })}
			class="bg-purple-600 text-xl px-8 py-2 font-bold rounded-full btn"
		>
			SPIN
		</button>
		<button
			onclick={() => dialog?.showModal()}
			class="text-neutral-700 hover:bg-white/10 p-1 rounded-md hover:text-neutral-600"
		>
			<Pencil />
		</button>
	</div>
</main>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog
	bind:this={dialog}
	class="bg-transparent"
	onclick={(ev) => {
		if (ev.target === dialog) {
			dialog.close();
		}
	}}
>
	<form
		method="dialog"
		class="bg-neutral-800 p-2 flex flex-col gap-2 text-white w-[500px] max-w-full rounded-lg"
	>
		<div class="flex justify-between items-center">
			<h1 class="text-xl font-bold">Options</h1>

			<button
				class="text-neutral-500 hover:bg-white/10 p-1 rounded-md hover:text-neutral-400"
				><X /></button
			>
		</div>

		{#each spin.options as option, i}
			<div class="flex gap-2 items-center w-full">
				<input
					class="bg-transparent flex-1 focus-within:bg-white/10 border border-neutral-400 rounded-full px-2 py-1 outline-none focus-within:ring ring-neutral-400"
					value={option}
					oninput={(ev) => {
						spin.options[i] = ev.currentTarget.value;
						send({
							type: 'options',
							options: spin.options,
						});
					}}
				/>
				<button
					onclick={(ev) => {
						ev.preventDefault();
						spin.options.splice(i, 1);
						send({
							type: 'options',
							options: spin.options,
						});
					}}
					class="text-neutral-500 hover:bg-white/10 p-1 rounded-md hover:text-neutral-400"
				>
					<Trash2 />
				</button>
			</div>
		{/each}
		<button
			class="text-neutral-300 flex items-center gap-2 hover:bg-white/10 py-1 px-2 hover:text-neutral-100 w-fit rounded-full"
			onclick={(ev) => {
				ev.preventDefault();
				spin.options.push('');
				send({
					type: 'options',
					options: spin.options,
				});
			}}
		>
			<Plus /> Add Option
		</button>

		<button
			class="bg-purple-600 w-fit text-lg px-4 self-end py-1 font-bold rounded-full btn"
			>Done</button
		>
	</form>
</dialog>

<style lang="postcss">
	.btn {
		transition:
			transform 0.1s ease-in-out,
			box-shadow 0.1s ease-in-out,
			background-color 0.1s ease-in-out;
		box-shadow: 0 0 0 0 theme(colors.purple.800);
	}
	.btn:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 0 0 theme(colors.purple.800);
	}
	.btn:active {
		transform: scale(0.98);
		box-shadow: 0 0 0 0 theme(colors.purple.800);
		background-color: theme(colors.purple.700);
	}
</style>
