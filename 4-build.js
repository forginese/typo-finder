console.log("### 4-build.js");

import fs from "fs";
import path from "path";

const config_path = path.join(process.cwd(), "config.json");
let config = {
	folders: {src: "src", base: "base", output: "output"},
	filenames: {
		final_json: "final.json", source_txt: "source.txt",
		corrections_txt: "corrections.txt", typos_txt: "typos.txt",
		extracted_msgs_txt: "messages.txt"
	},
	case_insensitive: true
}

if (fs.existsSync(config_path)) {config = {...config, ...JSON.parse(fs.readFileSync(config_path, "utf8"))};}

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
	const raw_links = fs.readFileSync(dictlinks_path, "utf8").split("\n").filter(l => l.trim() !== "");
	raw_links.forEach(line => {
		const parts = line.split(" || ");
		if (parts.length >= 3) {
			dict_links.set(config.case_insensitive ? parts[0].trim().toLowerCase() : parts[0].trim(), {url: parts[1].trim(), correction: parts[2].trim()});
		}
	});
}

const special_words = new Set();
if (fs.existsSync(specialwords_path)) {
	const raw_special = fs.readFileSync(specialwords_path, "utf8").split("\n").filter(w => w.trim().slice(1) !== "");
	raw_special.forEach(word => special_words.add(config.case_insensitive ? word.slice(1).toLowerCase() : word.slice(1)));
}

const typos_finalmap = new Map();
typos.forEach(typo => {
	const linkData = dict_links.get(typo) || {url: null, correction: null};
	typos_finalmap.set(typo, {
		word: typo, correction: linkData.correction,
		details: {
			dictionary_url: linkData.url === "null" ? null : linkData.url,
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
			const matchedTypos = typos.filter(typo => {
				const regex = new RegExp(`\\b${typo}\\b`, config.case_insensitive ? "i" : ""); return regex.test(msg.content);
			});
			
			if (matchedTypos.length > 0) {
				const msg_id = msg.id ? `msg_${msg.id}` : `msg_unknown_${Math.floor(Math.random()*10000)}`;
				const timestamp = msg.timestamp || null;

				if (!messages[msg_id]) {
					messages[msg_id] = {msg_id, timestamp, content: msg.content};
					foundMessagesForText.push({msg_id, timestamp, typos: matchedTypos, content: msg.content});
				}

				matchedTypos.forEach(typo => {
					typos_finalmap.get(typo).details.occurrences.push({msg_id, timestamp});
				});
			}
		}
	});
});

const corrections_map = new Map();
Array.from(typos_finalmap.values()).forEach(item => {
	if (item.correction && item.correction !== "null") {
		const correction_data = {word: item.correction, dictionary_url: item.details.dictionary_url, typos: []};
		if (!corrections_map.has(item.correction)) {corrections_map.set(item.correction, correction_data);}
		corrections_map.get(item.correction).typos.push(item.word);
	}
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