#!/bin/bash

git config user.name "automated"
git config user.email "actions@users.noreply.github.com"

actionUrl="https://github.com/yowmamasita/anmeldung/blob/main/README.md"

timestamp=$(TZ=Europe/Berlin date -u)

appointmentCount=$(cat results.txt | wc -l)

if [ "${appointmentCount}" -ne "0" ]; then
	curl -d "${appointmentCount} Anmeldung appointment(s) found! Book fast!" -H "Click: ${actionUrl}" ntfy.sh/anmeldung || exit 0;
fi

rm -f README.md
echo "# list of available Anmeldung appointments as of ${timestamp}" > README.md
cat results.txt >> README.md

git add -A
git commit -m "latest data: ${timestamp}, slots: ${appointmentCount}" || exit 0
git push
