import subprocess
import matplotlib.pyplot as plt
import pandas as pd
from dateutil import parser

# Run 'git log' command and get output as byte string
output = subprocess.check_output(['git', 'log', '--oneline'])

# Decode byte string to utf-8 and split output by newline character
output_lines = output.decode('utf-8').split('\n')

# Create a dictionary to store the total slots and count for each hour of the day
slots_by_hour = {hour: {'total_slots': 0, 'count': 0} for hour in range(24)}

# Loop through each line in the output and extract timestamp and slots information
for line in output_lines:
    if line and 'slots' in line:
        commit_info = line.split(', slots: ')
        if len(commit_info) != 2:
            continue
        timestamp = commit_info[0].split('latest data: ')[1]
        slots = int(commit_info[1])

        # If slots is greater than 0, add it to the total and increment the count for the corresponding hour of the day
        if slots > 0:
            hour_of_day = parser.parse(timestamp).hour
            slots_by_hour[hour_of_day]['total_slots'] += slots
            slots_by_hour[hour_of_day]['count'] += 1

# Calculate the average slots for each hour of the day
avg_slots_by_hour = {hour: slots_by_hour[hour]['total_slots'] / slots_by_hour[hour]['count']
                     if slots_by_hour[hour]['count'] > 0 else 0
                     for hour in slots_by_hour}

# Create a bar chart of the average slots by hour of the day
fig, ax = plt.subplots()
hours = [f'{hour}:00' for hour in range(24)]
avg_slots = [avg_slots_by_hour[hour] for hour in range(24)]
bars = ax.bar(hours, avg_slots)
ax.set_xlabel('Hour of the Day')
ax.set_ylabel('Average Slots')
ax.set_title('Average Slots When Slots > 0 by Hour of the Day')
plt.xticks(rotation=90)

# Add value labels to the bars
for bar, value in zip(bars, avg_slots):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f'{value:.1f}', ha='center', va='bottom')

plt.show()
