import puppeteer from 'puppeteer';
import * as fs from 'fs';

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

async function appointmentProcessor() {
	const browser2 = await puppeteer.launch();
	return async (appointment) => {
		console.log('old url', appointment);
		// if (/(Schöneweide|Köpenick|Blaschkoallee|Neukölln|Sonnenallee|Zwickauer|Rudow)/.test(appointment)) {
		// if (true) {
		const urlIndex = appointment.indexOf("https://");
		const url = appointment.substr(urlIndex);

		console.log(url);
		const page = await browser2.newPage();
		await page.goto(url);

		const newUrl = page.url();
		appointment = appointment.substring(0, urlIndex) + newUrl;
		console.log('new url', appointment);

		await page.close();
		// }
		return appointment;
	}
}

async function getAppointments(browser, dateUrl) {
	const page = await browser.newPage();
	await page.goto(dateUrl);

	const appointments = await page.evaluate(scrapeAppointments);

	// await page.screenshot({ path: 'anmeldung.png' });

	return appointments;
}

(async () => {
	const browser = await puppeteer.launch();

	const page = await browser.newPage();
	await page.goto(ANMELDUNG_URL);

	const bookable = await page.evaluate(scrapeBookable);

	console.log('dates', bookable);

	// await page.screenshot({ path: 'anmeldung.png' });

	if (bookable.length > 0) {
		console.log('found available dates', bookable.length);

		const appointmentsByDay = await Promise.all(bookable.map(async (e) => await getAppointments(browser, e)));
		const appointments = appointmentsByDay.flat();
		console.log('appointments', appointments);
		console.log('found appointments', appointments.length);

		const processAppointment = await appointmentProcessor();

		const processed = await appointments
			.map(processAppointment)
			.map(console.log)
			.filter(u => u.indexOf('termin/stop') === -1);

		fs.writeFileSync('results.txt', processed.join('\n') + '\n');
	} else {
		fs.writeFileSync('results.txt', '');
	}

	await browser.close();
})();
