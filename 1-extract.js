import fs from "fs";
import path from "path";

const src_folder = "src";
const src_path = path.join(process.cwd(), `/${src_folder}/`);

const output_folder = "output";
const output_path = path.join(process.cwd(), `/${output_folder}/`);

if (!fs.existsSync(output_path)) {fs.mkdirSync(output_path);}

// Get all JSON files in the src_folder (ignoring package.json)
const files = fs.readdirSync(src_path).filter(file => file.endsWith(".json") && file !== "package.json");

let allMessages = [];

files.forEach(file => {
	const file_path = path.join(src_path, file);
	const data = JSON.parse(fs.readFileSync(file_path, "utf8"));
	const messages = Array.isArray(data) ? data : (data.messages || []);
	messages.forEach(msg => {if (msg.content) {allMessages.push(msg.content);}});
});

const messagestxt_path = path.join(output_path, "messages.txt");
// Output inside output_folder
// 1. Output messages
fs.writeFileSync(messagestxt_path, allMessages.join("\n"));
console.log(`Extracted ${allMessages.length} messages to ${messagestxt_path}`);
// 2. Additional filtering via npx cspell