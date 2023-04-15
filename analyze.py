import subprocess
from datetime import datetime
from collections import defaultdict
import matplotlib.pyplot as plt

# Run 'git log' command and get output as byte string
output = subprocess.check_output(['git', 'log', '--oneline'])

# Decode byte string to utf-8 and split output by newline character
output_lines = output.decode('utf-8').split('\n')
output_lines = list(reversed(output_lines))

# Create a list to store the dictionaries
commits = []

# Loop through each line in the output and extract timestamp and slots information
for line in output_lines:
    if line and 'slots' in line:
        commit_info = line.split(', slots: ')
        if (len(commit_info) != 2):
            continue
        timestamp = commit_info[0].split('latest data: ')[1]
        slots = int(commit_info[1])
        if slots == 0 and commits and commits[-1]['slots'] == 0:
            continue
        commit_dict = {'timestamp': timestamp, 'slots': slots}
        commits.append(commit_dict)

# Calculate the periods of time when slots == 1
periods = []
for idx, commit in enumerate(commits[:-1]):
    if commit['slots'] == 0:
        start_time = datetime.strptime(commit['timestamp'], '%a %b %d %H:%M:%S %Z %Y')
        end_time = datetime.strptime(commits[idx + 1]['timestamp'], '%a %b %d %H:%M:%S %Z %Y')
        duration = end_time - start_time
        period_dict = {'start_time': start_time, 'end_time': end_time, 'duration': duration}
        periods.append(period_dict)

daily_duration = defaultdict(int)
hourly_duration = defaultdict(int)
daily_count = defaultdict(int)
hourly_count = defaultdict(int)

for item in periods:
    day_key = item['start_time'].strftime('%a')
    hour_key = item['start_time'].strftime('%I %p')
    daily_duration[day_key] += item['duration'].total_seconds() / 60 # convert to minutes
    hourly_duration[hour_key] += item['duration'].total_seconds() / 60 # convert to minutes
    daily_count[day_key] += 1
    hourly_count[hour_key] += 1

# Calculate the average duration for each day of the week and each hour
daily_duration_avg = {day: total_duration / daily_count[day] for day, total_duration in daily_duration.items()}
hourly_duration_avg = {hour: total_duration / hourly_count[hour] for hour, total_duration in hourly_duration.items()}

# Sort the day and hour labels
day_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
hour_order = [datetime(year=2023, month=4, day=15, hour=hour).strftime('%I %p') for hour in range(0, 24)]

print(hour_order)

# Daily chart
daily_avg_values = [daily_duration_avg[day] for day in day_order]

plt.figure(figsize=(10, 5))
bars = plt.bar(day_order, daily_avg_values)
plt.title('Average Waiting Duration for Slots per Day of the Week')
plt.xlabel('Day of the Week')
plt.ylabel('Average Waiting Duration for Slots (Minutes)')
plt.grid(axis='y')

# Add value labels to the bars
for bar, value in zip(bars, daily_avg_values):
    plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f'{value:.1f}', ha='center', va='bottom')

plt.show()

# Hourly chart
hourly_avg_values = [hourly_duration_avg[hour] for hour in hour_order]

plt.figure(figsize=(15, 5))
bars = plt.bar(hour_order, hourly_avg_values)
plt.title('Average Waiting Duration for Slots per Hour')
plt.xlabel('Hour')
plt.ylabel('Average Waiting Duration for Slots (Minutes)')
plt.xticks(rotation=45)
plt.grid(axis='y')

# Add value labels to the bars
for bar, value in zip(bars, hourly_avg_values):
    plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f'{value:.1f}', ha='center', va='bottom')

plt.show()
