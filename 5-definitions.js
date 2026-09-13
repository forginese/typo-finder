console.log("### 5-definitions.js");

import fs from "fs";
import path from "path";

const config_path = path.join(process.cwd(), "config.json");
let config = {
	folders: {src: "src", base: "base", output: "output"},
	filenames: {
		final_json: "final.json", source_txt: "source.txt",
		definitions_json: "definitions.json", custom_definitions_json: "custom_definitions.json",
		corrections_txt: "corrections.txt", typos_txt: "typos.txt",
		extracted_msgs_txt: "messages.txt"
	},
	typos_case_handling: "insensitive", // options: default = "insensitive", ["insensitive", "sensitive", "lowercase", "uppercase"]
	definition_fetch_delay: 650,
	definition_hiccup_delay: 2000,
	definition_retryafter_fallback: 2000,
	definition_fetch_retries: 3,
	definition_source: "wiktionary", // options: default = "wiktionary", ["wiktionary", "datamuse"]
	definition_has_phonetic: true,
	datamuse_ipa: true,

	"1_dry_run": false,
	"2_dry_run": false,
	"3_dry_run": false,
	"4_dry_run": false,
	"5_dry_run": false
}
if (fs.existsSync(config_path)) config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};
const valid_case_handling = ["sensitive", "insensitive", "lowercase", "uppercase"];
config.typos_case_handling = valid_case_handling.includes(config.typos_case_handling) ? config.typos_case_handling : "insensitive";
config.definition_source = config.definition_source === "datamuse" ? config.definition_source : "wiktionary";
config.dry_run = config["5_dry_run"] === true;

const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
const output_path = path.join(process.cwd(), `/${config.folders.output}/`);

const finaljson_path = path.join(output_path, config.filenames.final_json);
const customdefinitions_path = path.join(base_path, config.filenames.custom_definitions_json);
const definitionsjson_path = path.join(output_path, config.filenames.definitions_json);

if (!fs.existsSync(finaljson_path)) {console.log(`could not find ${finaljson_path}! did'ya you run 4-build.js first?`); process.exit(1);}
const final_raw = JSON.parse(fs.readFileSync(finaljson_path, "utf8"));
const corrections = final_raw.corrections.map(correction => correction.word);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms >= 0 ? ms : 0));

async function fetch_with_retry(url, options = {}, max_retries = 3) {
	if (config.dry_run) return Promise.resolve("haio");
	for (let attempt = 1; attempt <= max_retries; attempt++) {
		const response = await fetch(url, options);
		if (response.status === 429) {
			const retry_after = response.headers.get('Retry-After');
			const delay_seconds = retry_after ? parseInt(retry_after, 10) : config.definition_retryafter_fallback;
			console.warn(`--> hit a rate limit (${response.status})! attempt ${attempt} of ${max_retries}. waiting ${delay_seconds}s before retrying...`);
			await delay(delay_seconds * 1000); if (attempt !== max_retries) continue;
		}
		//if (!response.ok) {throw new Error(`i'm not ok! status: ${response.status}`);}
		return response;
	}
	//throw new Error(`failed to fetch_with_retry after ${max_retries} retries.`);
	// i'll just return the response on last retry and let fetch_definitions handle these error codes
}

const PARTS_OF_SPEECH_MAP = {
	"n": "noun",
	"v": "verb",
	"adj": "adjective",
	"adv": "adverb",
	"u": "unknown"
};

async function fetch_phonetic(word) {
	if (config.dry_run) return null;
	if (!config.definition_has_phonetic) return null;
	try {
		const response = await fetch_with_retry(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=r&max=1${config.datamuse_ipa ? "&ipa=1" : ""}`, {}, config.definition_fetch_retries || 3);
		if (response.ok) {
			const data = await response.json();
			if (data.length > 0 && data[0].tags) {
				if (data[0].word.toLowerCase() !== word.toLowerCase()) return null; // fallback to null, had to do this because "falled"'s phonetic returned as sounding like "fabled" wait is that gigi perez refere
				const ipa_tag = data[0].tags.find(tag => tag.startsWith("ipa_pron:"));
				const pron_tag = data[0].tags.find(tag => tag.startsWith("pron:"));
				if (ipa_tag) return `/${ipa_tag.split(":")[1]}/`;
				else if (pron_tag) return `/${pron_tag.split(":")[1].toLowerCase()}/`; // fallback format
			}
		}
	} catch (error) {console.log(`--> fetching datamuse phonetic for wiktionary errored. returning null instead:`, error.message);}
	return null;
}

async function normalize_wiktionary_output(word, wiktionary_data) {
	let normalized = config.definition_has_phonetic ? {word, phonetic: null, meanings: []} : {word, meanings: []};
	if (config.dry_run) return normalized;
	if (wiktionary_data.en) {
		wiktionary_data.en.forEach(entry => {
			const parts_of_speech = entry.partOfSpeech.toLowerCase();
			const definitions = entry.definitions.map(definition_data => definition_data.definition
				.replace(new RegExp("<style[^>]*>[\\s\\S]*?<\\/style>", "gi"), "").replace(new RegExp("<[^>]*>?", "g"), "").trim()
			).filter(definition => definition !== "");
			normalized.meanings.push({parts_of_speech, definitions});
		});
	}
	// wiktionary rest api doesn't include phonetics, so we fetch it using datamuse as a fallback.
	if (normalized.meanings.length > 0 && config.definition_has_phonetic) normalized.phonetic = await fetch_phonetic(word);
	return normalized;
}

function normalize_datamuse_output(word, datamuse_data) {
	const word_data = datamuse_data[0];
	let normalized = config.definition_has_phonetic ? {word, phonetic: null, meanings: []} : {word, meanings: []};
	if (config.dry_run) return normalized;
	if (word_data.word.toLowerCase() !== word.toLowerCase()) return normalized; // fallback to normalized
	if (word_data.tags && config.definition_has_phonetic) {
		const ipa_tag = word_data.tags.find(tag => tag.startsWith("ipa_pron:"));
		const pron_tag = word_data.tags.find(tag => tag.startsWith("pron:"));
		if (ipa_tag) normalized.phonetic = `/${ipa_tag.split(":")[1]}/`;
		else if (pron_tag) normalized.phonetic = `/${pron_tag.split(":")[1].toLowerCase()}/`; // fallback format
	}
	const meanings = {};
	if (word_data.defs) {
		word_data.defs.forEach(definition => {
			const parts = definition.split("\t");
			if (parts.length === 2) {
				const raw_partsofspeech = parts[0]; if (raw_partsofspeech === "N" || raw_partsofspeech === "PROPN") return;
				const text = parts[1]; if (text === "") return;
				const parts_of_speech = PARTS_OF_SPEECH_MAP[raw_partsofspeech] || raw_partsofspeech;

				if (!meanings[parts_of_speech]) meanings[parts_of_speech] = [];
				meanings[parts_of_speech].push(text);
			}
		});
		Object.entries(meanings).forEach(([parts_of_speech, definitions]) => normalized.meanings.push({parts_of_speech, definitions}));
	}
	return normalized;
}

async function fetch_definitions() {
	let definitions_cache = {};
	if (fs.existsSync(definitionsjson_path)) {definitions_cache = JSON.parse(fs.readFileSync(definitionsjson_path, "utf8"));}

	let custom_definitions = {};
	if (fs.existsSync(customdefinitions_path)) {custom_definitions = JSON.parse(fs.readFileSync(customdefinitions_path, "utf8"));}
	else {console.log(`could not find ${customdefinitions_path}! a blank json will be created in place for it.`); if (!config.dry_run) fs.writeFileSync(customdefinitions_path, JSON.stringify({}, null, 4));}

	console.log(`found ${corrections.length} total corrections.`);
	console.log(`found ${Object.keys(definitions_cache).length} existing definitions from cache.`);
	console.log(`using dictionary api source for definitions: "${config.definition_source}"\n`);

	let fetched = 0; // aka newly fetched
	let skipped = 0; // aka not found/skipped
	let custom_applied = 0; // related to custom_definitions

	for (let i = 0; i < corrections.length; i++) {
		const correction = corrections[i];
		if (config.dry_run) {
			console.log(`[${i + 1}/${corrections.length}] Correction: "${correction}"`);
			console.log(`fetching definition...`);
			await delay(50);
			console.log(`--> added "${correction}" to ${definitionsjson_path}!`);
			await delay((config.definition_fetch_delay || 650) - 50);
			console.log();
		}
		if (Object.hasOwn(custom_definitions, correction)) {
			if (!Object.hasOwn(definitions_cache, correction) || (JSON.stringify(definitions_cache[correction]) !== JSON.stringify(custom_definitions[correction]))) {
				console.log(`[${i + 1}/${corrections.length}] Correction: "${correction}"`);
				const custom_definition = config.definition_has_phonetic ? custom_definitions[correction] : {word: custom_definition.word, meanings: custom_definition.meanings};
				if (config.definition_has_phonetic) {
					console.log(`--> fetching phonetic for custom definition override...`);
					if (!custom_definition.phonetic) custom_definition.phonetic = await fetch_phonetic(correction);
				}
				definitions_cache[correction] = custom_definition; custom_applied++;
				if (!config.dry_run) fs.writeFileSync(definitionsjson_path, JSON.stringify(definitions_cache, null, 4));
				console.log(`--> applied custom definition override!\n`);
			}
			continue;
		}
		if (Object.hasOwn(definitions_cache, correction)) continue;
		console.log(`[${i + 1}/${corrections.length}] Correction: "${correction}"`);
		console.log(`fetching definition...`);
		
		try {
			let found = false;

			if (config.definition_source === "datamuse") {
				// datamuse
				const response = await fetch_with_retry(`https://api.datamuse.com/words?sp=${encodeURIComponent(correction)}&md=dr&max=1${config.datamuse_ipa ? "&ipa=1" : ""}`, {}, config.definition_fetch_retries || 3);
				if (response.ok) {
					const data = await response.json();
					if (data.length > 0 && data[0].defs) {
						definitions_cache[correction] = normalize_datamuse_output(correction, data); found = true;
					} else {found = false;}
				} else if (response.status >= 500) {
					console.log(`--> ${config.definition_source} server hiccup (${response.status}). skipping this correction for now...`);
					console.log(`     - run this script again to go through the failed words!\n`);
					await delay(config.definition_hiccup_delay || 2000); continue;
				}
				else if (response.status === 429) {console.log(`--> hit a rate limit ${config.definition_fetch_retries || 3} times (${response.status})! stopping to be safe.\n`); break;}
				else {console.log(`--> api error: ${response.status} ${response.statusText}\n`); break;}
			} else {
				// wiktionary
				const response = await fetch_with_retry(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(correction)}`, {
					headers: new Headers({
						"Api-User-Agent": "forgineseTypoFinder/1.0 (https://github.com/xondisw/forginese-typo-finder)"
					})
				}, config.definition_fetch_retries || 3);

				if (response.ok) {
					const data = await response.json();
					const normalized = await normalize_wiktionary_output(correction, data);
					if (normalized.meanings.length > 0) {definitions_cache[correction] = normalized; found = true;}
					else {found = false;}
				}
				else if (response.status === 404) {found = false;}
				else if (response.status >= 500) {
					console.log(`--> ${config.definition_source} server hiccup (${response.status}). skipping this correction for now...`);
					console.log(`     - run this script again to go through the failed words!\n`);
					await delay(config.definition_hiccup_delay || 2000); continue;
				}
				else if (response.status === 429) {console.log(`--> hit a rate limit ${config.definition_fetch_retries || 3} times (${response.status})! stopping to be safe.\n`); break;}
				else {console.log(`--> api error: ${response.status} ${response.statusText}\n`); break;}
			}

			if (found) fetched++;
			else {
				definitions_cache[correction] = null; skipped++;
				console.log(`--> not found in ${config.definition_source}!`);
			}

			if (!config.dry_run) fs.writeFileSync(definitionsjson_path, JSON.stringify(definitions_cache, null, 4));
			console.log(`--> added "${correction}" to ${definitionsjson_path}!`);

			// waiting 650ms (by default) before the next request, this can be edited in config.json if you're feeling a little risky
			await delay(config.definition_fetch_delay || 650);
		} catch (error) {console.error(`--> there was an error fetching "${correction}":`, error.message); break;}
		console.log();
	}

	console.log(`\nfffffinished checking dictionary!\n`);
	console.log(`JSON saved successfully to ${definitionsjson_path}`);
	console.log(`  - newly fetched: ${fetched}`);
	console.log(`  - not found/skipped: ${skipped}`);
	console.log(`  - custom definitions applied: ${custom_applied}`);
	console.log(`  - total cached: ${Object.keys(definitions_cache).length}`);
}

fetch_definitions();