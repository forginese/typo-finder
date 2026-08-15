console.log("### 4-build.js");

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
	case_insensitive: true,
	definition_fetch_delay: 650,
	definition_hiccup_delay: 2000,
	definition_retryafter_fallback: 2000,
	definition_fetch_retries: 3,
	definition_source: "wiktionary", // options: default = "wiktionary" and "datamuse"
	datamuse_ipa: true
}
if (fs.existsSync(config_path)) config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};
config.definition_source = config.definition_source === "datamuse" ? config.definition_source : "wiktionary";

const src_path = path.join(process.cwd(), `/${config.folders.src}/`);
const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
const output_path = path.join(process.cwd(), `/${config.folders.output}/`);

const typos_path = path.join(base_path, config.filenames.typos_txt);
const dictlinks_path = path.join(base_path, config.filenames.corrections_txt); // used to be called dict-links.txt, and it has shpaed this script the way it is, but i just can't be bothered to rename everything to reflect the filename change :pensive::pleading:

const typosourcetxt_path  = path.join(output_path, config.filenames.source_txt);
const typosourcejson_path = path.join(output_path, config.filenames.final_json); // used to be called typo-source but i couldn't be bothered to blah blah blah

const dictionaries_path = path.join(process.cwd(), "/dictionaries/");
const specialwords_path = path.join(dictionaries_path, "special-words.txt");

const typos_raw = fs.readFileSync(typos_path, "utf8");
const typos = config.case_insensitive
	// convert to lowercase and remove duplicates using new Set()
	? [...new Set(typos_raw.split("\n").filter(word => word.trim() !== "").map(word => word.toLowerCase()))]
	: typos_raw.split("\n").filter(word => word.trim() !== "")

// (expects: typo || url || correction)
const dict_links = new Map();
if (fs.existsSync(dictlinks_path)) {
	const raw_links = fs.readFileSync(dictlinks_path, "utf8").split("\n").filter(link => link.trim() !== "");
	raw_links.forEach(line => {
		const parts = line.split(" || ");
		if (parts.length >= 3) {
			dict_links.set(config.case_insensitive ? parts[0].trim().toLowerCase() : parts[0].trim(), {url: parts[1].trim(), correction: parts[2].trim()});
		}
	});
}

const special_words = new Set();
if (fs.existsSync(specialwords_path)) {
	const raw_special = fs.readFileSync(specialwords_path, "utf8").split("\n").filter(word => (word.trim() !== "" && word.startsWith("!")));
	raw_special.forEach(word => special_words.add(config.case_insensitive ? word.slice(1).toLowerCase() : word.slice(1)));
}

// this is here so that "anf." and "anf" would work. i'm crying
function escape_regex(string) {return string.replace(new RegExp("[.*+?^${}()|[\]\\]", "g"), "\\$&");}
// sorted by length so that anf. get's detected first. this word has took time from me I WILL NEVER GET BACK.
const escaped_typos = typos.map(escape_regex).sort((a, b) => b.length - a.length);
const typo_regex = new RegExp(`(?<!\\w)(${escaped_typos.join("|")})(?!\\w)`, config.case_insensitive ? "gi" : "g");

// for pagination
function generate_slug(string) {
  return escape_regex(string).trim().replace(".", "-dot").replace("!", "-exclamation").replace("?", "-question")
    .replace(new RegExp("[^a-zA-Z0-9-]", "g"), "").replace(new RegExp("-+", "g"), "-").replace(new RegExp("^-|-$", "g"), "");
}

const typos_finalmap = new Map();
typos.forEach(typo => {
	const link_data = dict_links.get(typo) || {url: null, correction: null};
	typos_finalmap.set(typo, {
		word: typo, slug: generate_slug(typo),
		correction: link_data.correction !== null ? {
			word: link_data.correction, slug: generate_slug(link_data.correction),
			dictionary_url: link_data.url === "null" ? null : link_data.url,
			typos: []
		} : null,
		details: {
			is_special: special_words.has(typo),
			occurrences: []
		}
	});
});

const message_files = fs.readdirSync(src_path).filter(file => file.endsWith(".json") && file !== "package.json");
const messages = {};
const foundMessagesForText = []; // used for the .txt report

message_files.forEach(file => {
	const file_path = path.join(src_path, file); const data = JSON.parse(fs.readFileSync(file_path, "utf8"));
	const messagesArray = Array.isArray(data) ? data : (data.messages || []);

	messagesArray.forEach(msg => {
		if (msg.content) {
			const matches = [...msg.content.matchAll(typo_regex)];
			
			if (matches.length > 0) {
				const matched = [...new Set(matches.map(match => {return config.case_insensitive ? match[0].toLowerCase() : match[0];}))];

				const msg_id = msg.id ? `msg_${msg.id}` : `msg_unknown_${Math.floor(Math.random()*10000)}`;
				const timestamp = msg.timestamp || null;

				if (!messages[msg_id]) {
					messages[msg_id] = {msg_id, timestamp, content: msg.content};
					foundMessagesForText.push({msg_id, timestamp, typos: matched, content: msg.content});
				}

				matched.forEach(typo => {
					typos_finalmap.get(typo).details.occurrences.push({msg_id, timestamp});
				});
			}
		}
	});
});

// there is probably a better way to code this but i just want this to work and it did
const corrections_map = new Map();
typos_finalmap.forEach(entry => {
	if (!entry.correction) return;
	const correction_data = entry.correction; if (!correction_data) return;

	if (!corrections_map.has(correction_data.word)) {
		corrections_map.set(correction_data.word, correction_data);
	}

	const correction_typos = corrections_map.get(correction_data.word).typos;
	correction_typos.push(entry.word);
	correction_typos.forEach(typo => {
		const typo_correctiondata = typos_finalmap.get(typo).correction; if (!typo_correctiondata) return;
		typo_correctiondata.typos = [...correction_typos];
	});
});

const finalJSONOutput = {messages, corrections: Array.from(corrections_map.values()), typos: Array.from(typos_finalmap.values())};

let textOutput = "# TYPO SOURCE MESSAGES\n\n";
foundMessagesForText.forEach(item => {
	textOutput += `typos matched: ${item.typos.join(", ")}\n`;
	textOutput += `msg id: ${item.msg_id}\n`;
	textOutput += `message: "${item.content}"\n`;
	textOutput += `timestamp: ${item.timestamp}\n`;
	textOutput += "\n";
});

fs.writeFileSync(typosourcetxt_path, textOutput);
fs.writeFileSync(typosourcejson_path, JSON.stringify(finalJSONOutput, null, 4));

console.log(`\nJSON created successfully to ${typosourcejson_path}!`);
console.log(`  - saved ${typos_finalmap.size} typos`);
console.log(`  - saved ${corrections_map.size} corrections`);
console.log(`  - saved ${Object.keys(messages).length} unique messages containing typos`);
console.log(`\noh and "TYPO SOURCE MESSAGES" txt file created successfully to ${typosourcetxt_path}!\n`);
console.log(`# you should be able to move on to running 5-definitions.js`);
console.log(`    - NOTE: 5-definitions.js fetches from an external source to extract definitions, so it requires an internet connection.\n`);