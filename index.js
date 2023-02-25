import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const ANMELDUNG_URL = 'https://service.berlin.de/terminvereinbarung/termin/tag.php?termin=1&anliegen[]=120686&dienstleisterlist=122210,122217,327316,122219,327312,122227,327314,122231,327346,122243,327348,122254,122252,329742,122260,329745,122262,329748,122271,327278,122273,327274,122277,327276,330436,122280,327294,122282,327290,122284,327292,122291,327270,122285,327266,122286,327264,122296,327268,150230,329760,122297,327286,122294,327284,122312,329763,122314,329775,122304,327330,122311,327334,122309,327332,317869,122281,327352,122279,329772,122283,122276,327324,122274,327326,122267,329766,122246,327318,122251,327320,122257,327322,122208,327298,122226,327300&herkunft=http%3A%2F%2Fservice.berlin.de%2Fdienstleistung%2F120686%2F';

function scrapeBookable() {
	return Array
		.from(document.querySelectorAll('tr > .buchbar > a'))
		.map(d => d.href);
}

function scrapeAppointments() {
	const parts = window.location.href.split('/');
	const lastSegment = parts.pop() || parts.pop();

	const schedule = (new Date(parseInt(lastSegment, 10) * 1000))
		.toLocaleString('de-DE', { dateStyle: 'full', timeZone: 'Europe/Berlin' });

	return Array
		.from(document.querySelectorAll('tr'))
		.map(e => {
			const url = e.querySelector('a').href;
			const location = e.innerText.replace('\t', ' ');
			return `- ${schedule} ${location} ${url}`;
		});
}

async function appointmentProcessor(browser) {
	return async (appointment) => {
		// return appointment;
		// if (!(/(Schöneweide|Köpenick|Blaschkoallee|Neukölln|Sonnenallee|Zwickauer|Rudow)/.test(appointment))) return appointment;

		const urlIndex = appointment.indexOf("https://");
		const url = appointment.substr(urlIndex);

		const page = await browser.newPage();
		await page.setRequestInterception(true);

		let finalUrl;

		// get final url after redirects
		page.on('request', (request) => {
			if (request.isNavigationRequest()) {
				finalUrl = request.url();
			}
			request.continue();
		});

		await page.goto(url, { waitUntil: 'networkidle2' });

		const appointmentId = Date.now().toString(36) + Math.random().toString(36);

		// await page.screenshot({ path: `STEP1-${appointmentId}.png` }, { fullPage: true });
		// const step1appointmentHtml = await page.evaluate(() => document.querySelector('*').outerHTML);
		// fs.writeFileSync(`STEP1-${appointmentId}.html`, step1appointmentHtml);

		await page.$eval('#familyName', el => el.value = 'Ben Adrian Sarmiento');
		await page.$eval('#email', el => el.value = 'me@bensarmiento.com');
		const telephone = await page.$('#telephone');
		if (telephone) {
			await telephone.type('+4915774990994');
		}
		await page.$eval('#agbgelesen', checkbox => checkbox.click());
		await page.$eval('select[name="surveyAccepted"]', dropdown => {
				dropdown.value = '1';
				dropdown.dispatchEvent(new Event('change'));
			});
		// await page.$eval('#register_submit', btnSubmit => btnSubmit.click());
		// await page.waitForNavigation();

		// const cookies = await page.cookies();
		// console.log('Cookies for ' + finalUrl, cookies);

		await page.screenshot({ path: `STEP2-${appointmentId}.png` }, { fullPage: true });

		// const step2appointmentHtml = await page.evaluate(() => document.querySelector('*').outerHTML);
		// fs.writeFileSync(`STEP2-${appointmentId}.html`, step2appointmentHtml);

		await page.close();
		return appointment.substring(0, urlIndex) + finalUrl;
	}
}

async function getAppointments(browser, dateUrl) {
	const page = await browser.newPage();
	await page.goto(dateUrl);

	const appointments = await page.evaluate(scrapeAppointments);

	// await page.screenshot({ path: 'anmeldung.png' });
	await page.close();

	return appointments;
}

function executeCommand(command, args) {
	return new Promise((resolve, reject) => {
		const process = spawn(command, args);

		let output = '';
		let error = '';

		process.stdout.on('data', (data) => {
			output += data.toString();
		});

		process.stderr.on('data', (data) => {
			error += data.toString();
		});

		process.on('close', (code) => {
			if (code === 0) {
				resolve(output.trim());
			} else {
				reject(new Error(error.trim()));
			}
		});
	});
}

async function main(browser) {
	const page = await browser.newPage();
	await page.goto(ANMELDUNG_URL);

	const bookable = await page.evaluate(scrapeBookable);
	// await page.screenshot({ path: 'anmeldung.png' });
	await page.close();

	if (bookable.length === 0) return;

	await fetch('https://sm.hetrixtools.net/hb/?s=49af524700d95e59166d708d3b1b5359');

	console.log('Found ' + bookable.length + ' bookable dates.', bookable);

	const appointmentsByDay = await Promise.all(bookable.map(async (e) => await getAppointments(browser, e)));
	const appointments = appointmentsByDay.flat();

	console.log('Found ' + appointments.length + ' appointments.', appointments);

	const processAppointment = await appointmentProcessor(browser);

	const processed = (
		await Promise.all(
			appointments.map(processAppointment)
		)
	).filter(a => a && a.indexOf('termin/stop') === -1);
	console.log('Found ' + processed.length + ' processed appointments.', processed);

	if (processed.length > 0) {
		fs.writeFileSync('results.txt', processed.join('\n') + '\n');
	} else {
		fs.writeFileSync('results.txt', '');
	}

	await executeCommand('./update.sh');
}

(async () => {
	const browser = await puppeteer.launch();

	while (true) {
		await main(browser);
		await new Promise(resolve => setTimeout(resolve, 500));
	}
})();
