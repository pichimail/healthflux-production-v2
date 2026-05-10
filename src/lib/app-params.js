// @ts-nocheck
const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const getStorageItem = (key) => {
	if (typeof storage?.getItem === 'function') {
		return storage.getItem(key);
	}
	return storage instanceof Map ? storage.get(key) ?? null : null;
}

const setStorageItem = (key, value) => {
	if (typeof storage?.setItem === 'function') {
		storage.setItem(key, value);
		return;
	}
	if (storage instanceof Map) {
		storage.set(key, value);
	}
}

const removeStorageItem = (key) => {
	if (typeof storage?.removeItem === 'function') {
		storage.removeItem(key);
		return;
	}
	if (storage instanceof Map) {
		storage.delete(key);
	}
}

const env = /** @type {any} */ (import.meta).env || {};

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		setStorageItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		setStorageItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = getStorageItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		removeStorageItem('base44_access_token');
		removeStorageItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: env.VITE_BASE44_APP_ID }),
		serverUrl: getAppParamValue("server_url", { defaultValue: env.VITE_BASE44_BACKEND_URL }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version"),
	}
}


export const appParams = {
	...getAppParams()
}
