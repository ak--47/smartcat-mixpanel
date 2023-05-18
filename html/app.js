/* eslint-disable no-unused-vars */
// @ts-nocheck
const qs = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);

const app = {
	//storage
	DOM: {},
	init,

	//interactive
	cacheDOM,
	bindEventsAndViews,
	buildDropdowns,
	loader,

	//validation
	getFields,
	checkFields,
	isValid,

	//parsing
	handleFileUpload,
	parseServerTemplate,

	getConfig,

	//buttons
	run,
};

function init() {
	this.DOM = this.cacheDOM();
	// this.buildDropdowns(this.DOM.columns);
	this.bindEventsAndViews();
	// this.freezeView();
}

/*
----
DOM STUFF
----
*/

function cacheDOM() {
	return {
		//screens
		typeSelector: qs("#record_type"),
		eventMappings: qs("#event_mapping"),
		userMappings: qs("#user_mapping"),
		groupMappings: qs("#group_mapping"),
		tableMappings: qs("#table_mapping"),
		howAuth: qs("#auth_type"),
		serviceAcctForm: qs("#service_acct_form"),
		apiSecretForm: qs("#api_secret_form"),

		//fields
		projectId: qs("#project_id"),
		token: qs("#token"),
		region: qs("#region"),
		serviceUser: qs("#service_acct"),
		serviceSecret: qs("#service_secret"),
		apiSecret: qs("#api_secret"),
		allMappingFields: Array.from(qsa("select.dropdown.data, input.data.field")),
		allUserInputFields: Array.from(qsa("select, input, button, .data")),

		//labels
		typeLabel: qs("#type_label"),
		docs: qs("#docs"),

		//buttons
		runButton: qs("#run"),
		uploadButton: qs("#file_upload"),
		hiddenFileLoader: qs("#file_input"),

		//status
		loader: qs("#loader"),
		status: qs("#status_text"),
		sheetNameLabel: qs("#file_name_label"),
		projectLink: qs("#project_link"),
	};
}

function buildDropdowns(columns) {
	const selectMenus = Array.from(qsa("select.data.dropdown")).filter((node) => node.id !== "profile_operation");

	// const existingCols = Object.values(filterObj(app.DOM.config, key => key.endsWith("_col"), "key"));
	// for (const col of existingCols) {
	// 	columns.push(col);
	// }

	for (const select of selectMenus) {
		for (const column of columns) {
			const opt = document.createElement("option");
			opt.value = column;
			opt.innerHTML = column;
			select.appendChild(opt);
		}
		if (select.parentNode.parentElement.id === "event_mapping") {
			if (["event_name_col", "distinct_id_col"].includes(select.id)) {
				const hardcodeOpt = document.createElement("option");
				hardcodeOpt.value = "hardcode";
				hardcodeOpt.innerHTML = `Other (specify)`;
				select.appendChild(hardcodeOpt);
				select.addEventListener("change", (ev) => {
					if (ev.currentTarget.value === "hardcode") {
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.remove("hidden");
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.remove("optional");
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.add("required");
					} else {
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.add("hidden");
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.add("optional");
						ev.currentTarget.nextElementSibling.nextElementSibling.classList.remove("required");
					}
				});
			}
		}
	}
}

function bindEventsAndViews() {
	//upload
	this.DOM.hiddenFileLoader.addEventListener("change", handleFileUpload, false);

	// TYPES + MAPPINGS
	this.DOM.typeSelector.addEventListener("change", (e) => {
		const newVal = e.currentTarget.value;
		this.DOM.typeLabel.innerText = newVal;
		if (newVal === "event") {
			this.DOM.eventMappings.classList.remove("hidden");
			this.DOM.userMappings.classList.add("hidden");
			this.DOM.groupMappings.classList.add("hidden");
			this.DOM.tableMappings.classList.add("hidden");
			//hide syncs for events
			qs('#auth_type option[value="api_secret"]').disabled = false;
		}
		if (newVal === "user") {
			this.DOM.eventMappings.classList.add("hidden");
			this.DOM.userMappings.classList.remove("hidden");
			this.DOM.groupMappings.classList.add("hidden");
			this.DOM.tableMappings.classList.add("hidden");
			qs('#auth_type option[value="api_secret"]').disabled = false;
		}
		if (newVal === "group") {
			this.DOM.eventMappings.classList.add("hidden");
			this.DOM.userMappings.classList.add("hidden");
			this.DOM.groupMappings.classList.remove("hidden");
			this.DOM.tableMappings.classList.add("hidden");

			qs('#auth_type option[value="api_secret"]').disabled = false;
		}
		if (newVal === "table") {
			this.DOM.eventMappings.classList.add("hidden");
			this.DOM.userMappings.classList.add("hidden");
			this.DOM.groupMappings.classList.add("hidden");
			this.DOM.tableMappings.classList.remove("hidden");
			setValues("#auth_type", "service_account");
			qs('#auth_type option[value="api_secret"]').disabled = true;
		}
	});

	// AUTH DETAILS
	this.DOM.howAuth.addEventListener("change", (e) => {
		const newVal = e.currentTarget.value;
		if (newVal === "service_account") {
			this.DOM.apiSecretForm.classList.add("hidden");
			this.DOM.serviceAcctForm.classList.remove("hidden");
		}

		if (newVal === "api_secret") {
			this.DOM.apiSecretForm.classList.remove("hidden");
			this.DOM.serviceAcctForm.classList.add("hidden");
		}
	});

	// "real-time" field validation
	for (const key in this.DOM) {
		if (this.DOM[key].tagName === "SELECT") {
			this.DOM[key].addEventListener("change", () => {
				this.checkFields();
			});
		}

		if (this.DOM[key].tagName === "INPUT") {
			this.DOM[key].addEventListener("input", () => {
				this.checkFields();
			});
		}
	}
	for (const dataField of this.DOM.allMappingFields) {
		if (dataField.tagName === "SELECT") {
			dataField.addEventListener("change", () => {
				this.checkFields();
			});
		}

		if (dataField.tagName === "INPUT") {
			dataField.addEventListener("input", () => {
				this.checkFields();
			});
		}
	}

	// actions
	this.DOM.runButton.addEventListener("click", () => {
		//todo
	});

	this.DOM.uploadButton.addEventListener("click", () => {
		this.DOM.hiddenFileLoader.click();
	});
}

/*
----
GETTERS
----
*/

function getConfig() {
	const userData = mergeObj(Object.values(this.getFields()));
	return userData;
}

function checkFields() {
	const userData = mergeObj(Object.values(this.getFields()));
	userData.config_type = "sheet-to-mixpanel";
	const valid = this.isValid(userData);
	this.DOM.status.innerText = "";
	this.DOM.projectLink.innerText = "";
	// console.log(JSON.stringify(userData, null, 2));

	if (valid) {
		this.DOM.runButton.disabled = false;
	} else {
		this.DOM.runButton.disabled = true;
	}
}

function getFields() {
	// enumerate all visible fields
	const visible = filterObj(this.DOM, (el) => {
		// https://stackoverflow.com/a/21696585
		return el.offsetParent && (el.classList.contains("data") || el.classList.contains("mapping"));
	});

	const fields = mapObj(visible, (node) => {
		if (node.classList.contains("mapping")) {
			const mappingsDOM = Array.from(node.querySelectorAll("select, input"));
			const mappingsArr = mappingsDOM.map((mapping) => {
				return { [mapping.id]: mapping.value };
			});
			const mappings = mergeObj(mappingsArr);
			return mappings;
		} else {
			return { [node.id]: node.value };
		}
	});

	return fields;
}

function parseServerTemplate(node) {
	try {
		return JSON.parse(node.innerText);
	} catch (e) {
		return {};
	}
}

/*
----
SETTERS
----
*/

//handle file loading
function handleFileUpload() {
	const file = this.files[0];
	const fileReader = new FileReader();
	fileReader.addEventListener("load", function (event) {
		//todo
		// const parsedData = JSON.parse(fileReader.result);
		// //tweak the seed
		// if (tweakSeed) {
		// 	parsedData.config.seed += ` ${dm.methods.makeId(5)}`;
		// }
		// let loadEvent = new CustomEvent("load", {
		// 	bubbles: true,
		// 	composed: true,
		// 	detail: parsedData,
		// });
		// host.dispatchEvent(loadEvent);
	});

	fileReader.readAsText(file);
}

function setValues(cssSelector, value) {
	Array.from(qsa(cssSelector)).forEach((node) => {
		node.value = value;
		if (node.tagName === "INPUT") node.dispatchEvent(new Event("input"));
		if (node.tagName === "SELECT") node.dispatchEvent(new Event("change"));
	});
}

/*
----
RUN SERVER SIDE FUNCTIONS
----
*/

function run() {
	this.loader("show");
	this.DOM.status.innerText = `syncing data!`;
	this.DOM.runButton.disabled = true;
	//todo routes
}

/*
----
VALIDATION
----
*/

function isValid(config) {
	const { record_type, project_id, token, region, auth_type, service_acct, service_secret, api_secret } = config;
	if (!project_id) return false;
	if (!token) return false;
	if (auth_type === "service_account") {
		if (!service_acct || !service_secret) return false;
	}
	if (auth_type === "api_secret") {
		if (!api_secret) return false;
	}

	if (record_type === "event") {
		const { event_name_col, distinct_id_col, time_col, insert_id_col, hardcode_event_name, hardcode_distinct_id } =
			config;
		if (!event_name_col) return false;
		// don't force distinct_id for ad spend data
		// if (!distinct_id_col) return false;
		if (!time_col) return false;
		if (event_name_col === "hardcode" && !hardcode_event_name) return false;
		if (distinct_id_col === "hardcode" && !hardcode_distinct_id) return false;
	}

	if (record_type === "user") {
		const { distinct_id_col, name_col, email_col, avatar_col, created_col } = config;
		if (!distinct_id_col) return false;
	}

	if (record_type === "group") {
		const { distinct_id_col, name_col, email_col, avatar_col, created_col, group_key } = config;
		if (!group_key) return false;
		if (!distinct_id_col) return false;
	}

	if (record_type === "table") {
		const { lookup_table_id } = config;
		if (!lookup_table_id) return false;
	}

	return true;
}

function loader(directive) {
	if (directive === "show") {
		this.DOM.loader.style.display = "inline-block";
		this.DOM.loader.classList.remove("hidden");
	}
	if (directive === "hide") {
		this.DOM.loader.style.display = "";
		this.DOM.loader.classList.add("hidden");
	}
}

/*
----
UTILITIES
----
*/

function comma(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function filterObj(hash, test_function, keysOrValues = "value") {
	let key, i;
	const iterator = Object.keys(hash);
	const filtered = {};

	for (i = 0; i < iterator.length; i++) {
		key = iterator[i];
		if (keysOrValues === "value") {
			if (test_function(hash[key])) {
				filtered[key] = hash[key];
			}
		}
		if (keysOrValues === "key") {
			if (test_function(key.toString())) {
				filtered[key] = hash[key];
			}
		}
	}
	return filtered;
}

function mapObj(object, mapFn) {
	return Object.keys(object).reduce(function (result, key) {
		result[key] = mapFn(object[key]);
		return result;
	}, {});
}

function mergeObj(arr) {
	return arr.reduce(function (acc, current) {
		for (var key in current) {
			if (current.hasOwnProperty(key)) {
				acc[key] = current[key];
			}
		}
		return acc;
	}, {});
}

app.init(); //😎 BOOM!
