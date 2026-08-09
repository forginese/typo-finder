console.log("### 1-extract.js");

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

if (!fs.existsSync(src_path)) {fs.mkdirSync(src_path);}
if (!fs.existsSync(base_path)) {fs.mkdirSync(base_path);}
if (!fs.existsSync(output_path)) {fs.mkdirSync(output_path);}

const messages_path = path.join(base_path, config.filenames.extracted_msgs_txt);

// Get all JSON files in the src_folder (ignoring package.json)
const files = fs.readdirSync(src_path).filter(file => file.endsWith(".json") && file !== "package.json");

let all_messages = [];

files.forEach(file => {
	const file_path = path.join(src_path, file);
	const data = JSON.parse(fs.readFileSync(file_path, "utf8"));
	const messages = Array.isArray(data) ? data : (data.messages || []);
	messages.forEach(msg => {if (msg.content) {all_messages.push(msg.content);}});
});

fs.writeFileSync(messages_path, all_messages.join("\n"));
console.log(`extracted ${all_messages.length} messages to ${messages_path}\n`);
console.log(`# you should be able to move on to running 2-cspell.js\n`);