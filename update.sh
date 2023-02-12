#!/bin/bash

git config user.name "automated"
git config user.email "actions@users.noreply.github.com"

anmeldungUrl="https://service.berlin.de/terminvereinbarung/termin/tag.php?termin=1&anliegen[]=120686&dienstleisterlist=122210,122217,327316,122219,327312,122227,327314,122231,327346,122243,327348,122254,122252,329742,122260,329745,122262,329748,122271,327278,122273,327274,122277,327276,330436,122280,327294,122282,327290,122284,327292,122291,327270,122285,327266,122286,327264,122296,327268,150230,329760,122294,327284,122312,329763,122314,329775,122304,327330,122311,327334,122309,327332,317869,122281,327352,122279,329772,122283,122276,327324,122274,327326,122267,329766,122246,327318,122251,327320,122257,327322,122208,327298,122226,327300&herkunft=http%3A%2F%2Fservice.berlin.de%2Fdienstleistung%2F120686%2F"

actionUrl="https://github.com/yowmamasita/anmeldung/blob/main/README.md"

timestamp=$(TZ=Europe/Berlin date)

appointmentCount=$(cat results.txt | wc -l)

if [ "${appointmentCount}" -ne "0" ]; then
	curl -d "${appointmentCount} Anmeldung appointment(s) found! Book fast!" -H "Click: ${actionUrl}" ntfy.sh/anmeldung || exit 0;
fi

rm -f README.md
echo "# list of available Anmeldung appointments as of ${timestamp}" > README.md
echo "[Link to Anmeldung website](${anmeldungUrl})" >> README.md
cat results.txt >> README.md

git add -A
git commit -m "latest data: ${timestamp}, slots: ${appointmentCount}" || exit 0
git push

wget --spider "https://sm.hetrixtools.net/hb/?s=49af524700d95e59166d708d3b1b5359"
