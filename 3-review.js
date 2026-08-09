console.log("### 3-review.js");

import fs from "fs";
import path from "path";
import readline from "readline";

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

const base_path = path.join(process.cwd(), `/${config.folders.base}/`);
const output_path = path.join(process.cwd(), `/${config.folders.output}/`);

const typos_path = path.join(base_path, config.filenames.typos_txt);
const corrections_path = path.join(base_path, config.filenames.corrections_txt);

const dictionaries_path = path.join(process.cwd(), "/dictionaries/");
const exclude_path = path.join(dictionaries_path, "excluded-words.txt");

if (!fs.existsSync(typos_path)) {console.log(`could not find ${typos_path}! did'ya you run 2-cspell.js first?`); process.exit(1);}
if (!fs.existsSync(exclude_path)) {console.log(`could not find ${exclude_path}! a blank file will be created in place for it.`); fs.writeFileSync(exclude_path, "");}
// excluded words is required. this will create a blank file automatically.

const typos_raw = fs.readFileSync(typos_path, "utf8");
const typos = typos_raw.split("\n").filter(word => word.trim() !== "");

const rl = readline.createInterface({input: process.stdin, output: process.stdout});
const ask_question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function init_review() {
	let processedDict = new Map(); let existingExcludes = new Set();
	let previousDictSize = 0; let previousExcludesSize = 0;

	if (fs.existsSync(exclude_path)) {
		const raw_excludes = fs.readFileSync(exclude_path, "utf8").split("\n").filter(word => word.trim() !== "");
		raw_excludes.forEach(word => existingExcludes.add(word));
		previousExcludesSize = existingExcludes.size;
		console.log(`found ${existingExcludes.size} excluded words.`);
	}

	if (fs.existsSync(corrections_path)) {
		const raw_links = fs.readFileSync(corrections_path, "utf8").split("\n").filter(line => line.trim() !== "");
		raw_links.forEach(line => {
			const parts = line.split(" || ");
			if (parts.length >= 2) {processedDict.set(parts[0].trim(), parts.slice(1).join(" || ").trim());}
		});

		previousDictSize = processedDict.size;
		if (processedDict.size > 0) {
			console.log(`found previous progress: ${processedDict.size} typos already linked.`);
			const choice = await ask_question("do you want to (c)ontinue from missing typos or (s)tart over? [c/s]:");
			
			if (choice.trim().toLowerCase() === "s") {processedDict.clear(); console.log("starting over from scratch.");}
			else {console.log("resuming progress...");}
		}
	}

	let typosToReview = typos.filter(typo => !processedDict.has(typo) && !existingExcludes.has(typo));

	console.log(`\n# TYPO REVIEWER`);
	console.log(`remaining typos to review: ${typosToReview.length}\n`);

	let newExcludeds = [];

	for (let i = 0; i < typosToReview.length; i++) {
		const typo = typosToReview[i];
		console.log(`[${i + 1}/${typosToReview.length}] Typo: "${typo}"`);
		console.log("  - Paste URL to assign a dictionary link");
		console.log("  - Type \"none\" if there's no link, but you want to provide a correction");
		console.log("  - Type \"null\" to exclude word (rerun 2-cspell.js to apply changes)");
		console.log("  - Press enter to skip (URLs that don't start with http:// or https:// will be skipped)");
		
		const answer = await ask_question("input: ");
		const input = answer.trim();

		if (input.toLowerCase() === "null") {
			existingExcludes.add(typo); newExcludeds.push(typo);
			console.log(`--> added "${typo}" to ${exclude_path}.`);

		} else if (input.toLowerCase() === "none" || input.toLowerCase() === "no") {
			let correctionInput = await ask_question("  - what is the corrected word?: ");
			let finalCorrection = correctionInput.trim();

			if (finalCorrection !== "") {
				processedDict.set(typo, `null || ${finalCorrection}`);
				console.log(`--> saved correction "${finalCorrection}" (no link) for "${typo}".`);
			} else console.log(`--> skipped "${typo}" (correction cannot be empty).`);

		} else if (input !== "" && (input.startsWith("https://") || input.startsWith("http://"))) {
			// auto-guess the correction if it"s wiktionary (i use wikitionary as links for the corrected so this makes life easier for me)
			let guessedCorrection = "";
			if (input.includes("wiktionary.org/wiki/")) {guessedCorrection = decodeURIComponent(input.split("/wiki/").pop().replace(/_/g, " "));}
			
			const promptText = guessedCorrection ? 
				`  - What is the corrected word? (Press enter for "${guessedCorrection}"): ` : 
				"  - What is the corrected word?: ";
				
			let correctionInput = await ask_question(promptText);
			let finalCorrection = correctionInput.trim() === "" ? guessedCorrection : correctionInput.trim();

			processedDict.set(typo, finalCorrection ? `${input} || ${finalCorrection}` : input);
			console.log(`--> saved link and correction "${finalCorrection}" for "${typo}".`);
			
		} else console.log(`--> skipped "${typo}".`);
		console.log("\n");
	};
	rl.close();

	if (processedDict.size > 0) {
		const lines = Array.from(processedDict.entries()).map(([word, data]) => `${word} || ${data}`);
		fs.writeFileSync(corrections_path, lines.join("\n"));
		console.log(`saved ${(processedDict.size > previousDictSize) ? processedDict.size - previousDictSize : 0} new dictionary links to ${corrections_path}`);
	}
	if (existingExcludes.size > 0) {
		const sortedExcludes = Array.from(existingExcludes).sort();
		fs.writeFileSync(exclude_path, sortedExcludes.join("\n"));
		console.log(`added ${(existingExcludes.size > previousExcludesSize) ? existingExcludes.size - previousExcludesSize : 0} new excluded words to ${exclude_path}`);
	}
	console.log("\n");
	console.log(`rrrrreview complete!\n`);
	console.log(`# you should be able to move on to running 4-build.js`);
	console.log(`    - rerun 2-cspell.js if new excluded words have been added.\n`);
}

init_review();