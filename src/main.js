import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'Simple Effing Timer'
	}
});

export default app;