import storage from "node-persist";

let initialized = false;

const instance = {
	init,
	get,
	set,
	remove,
};

async function init() {
	// @ts-ignore
	await storage.init();
	initialized = true;
	return true;
}

async function get(name = "OPENAI_API_KEY") {
	if (!initialized) await init();
	// @ts-ignore
	return await storage.getItem(name);
}

async function set(name = "OPENAI_API_KEY", data) {
	if (!initialized) await init();
	// @ts-ignore
	return await storage.setItem(name, data);
}

async function remove() {
	if (!initialized) await init();
	// @ts-ignore
	await storage.clear();
	return {};
}

export default instance;
