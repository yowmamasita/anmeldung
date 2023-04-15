import subprocess
import matplotlib.pyplot as plt
import pandas as pd
from dateutil import parser

# Run 'git log' command and get output as byte string
output = subprocess.check_output(['git', 'log', '--oneline'])

# Decode byte string to utf-8 and split output by newline character
output_lines = output.decode('utf-8').split('\n')

# Create a dictionary to store the total slots and count for each day of the week
slots_by_day = {0: {'total_slots': 0, 'count': 0},
                1: {'total_slots': 0, 'count': 0},
                2: {'total_slots': 0, 'count': 0},
                3: {'total_slots': 0, 'count': 0},
                4: {'total_slots': 0, 'count': 0},
                5: {'total_slots': 0, 'count': 0},
                6: {'total_slots': 0, 'count': 0}}

# Loop through each line in the output and extract timestamp and slots information
for line in output_lines:
    if line and 'slots' in line:
        commit_info = line.split(', slots: ')
        if len(commit_info) != 2:
            continue
        timestamp = commit_info[0].split('latest data: ')[1]
        slots = int(commit_info[1])

        # If slots is greater than 0, add it to the total and increment the count for the corresponding day of the week
        if slots > 0:
            day_of_week = parser.parse(timestamp).weekday()
            slots_by_day[day_of_week]['total_slots'] += slots
            slots_by_day[day_of_week]['count'] += 1

# Calculate the average slots for each day of the week
avg_slots_by_day = {day: slots_by_day[day]['total_slots'] / slots_by_day[day]['count']
                    if slots_by_day[day]['count'] > 0 else 0
                    for day in slots_by_day}

# Create a bar chart of the average slots by day of the week
fig, ax = plt.subplots()
days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
avg_slots = [avg_slots_by_day[day] for day in range(7)]
bars = ax.bar(days, avg_slots)
ax.set_xlabel('Day of the Week')
ax.set_ylabel('Average Slots')
ax.set_title('Average Slots When Slots > 0 by Day of the Week')

# Add value labels to the bars
for bar, value in zip(bars, avg_slots):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f'{value:.1f}', ha='center', va='bottom')

plt.show()
