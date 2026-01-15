import csv
import json
import math
from django.http import JsonResponse
from django.conf import settings
import os

def load_csv_data():
    data = []
    csv_path = os.path.join(settings.DATA_DIR, 'aadhaar_updates.csv')
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'date': row['date'],
                'state': row['state'],
                'district': row['district'],
                'update_type': row['update_type'],
                'num_updates': int(row['num_updates'])
            })
    return data

def get_updates(request):
    data = load_csv_data()
    state = request.GET.get('state')
    district = request.GET.get('district')
    update_type = request.GET.get('update_type')
    
    if state:
        data = [d for d in data if d['state'] == state]
    if district:
        data = [d for d in data if d['district'] == district]
    if update_type and update_type != 'All':
        data = [d for d in data if d['update_type'] == update_type]
    
    return JsonResponse({'data': data})

def get_states(request):
    data = load_csv_data()
    states = sorted(list(set(d['state'] for d in data)))
    return JsonResponse({'states': states})

def get_districts(request, state):
    data = load_csv_data()
    districts = sorted(list(set(d['district'] for d in data if d['state'] == state)))
    return JsonResponse({'districts': districts})

def get_update_types(request):
    data = load_csv_data()
    types = sorted(list(set(d['update_type'] for d in data)))
    return JsonResponse({'update_types': ['All'] + types})

def calculate_anomalies(data, window_size, z_threshold):
    sorted_data = sorted(data, key=lambda x: x['date'])
    updates = [d['num_updates'] for d in sorted_data]
    result = []
    
    for i, d in enumerate(sorted_data):
        window_data = updates[max(0, i - window_size + 1):i + 1]
        mean = sum(window_data) / len(window_data)
        variance = sum((x - mean) ** 2 for x in window_data) / len(window_data)
        std = math.sqrt(variance) if variance > 0 else 1
        z_score = (d['num_updates'] - mean) / std
        is_anomaly = abs(z_score) > z_threshold
        
        if z_score > z_threshold:
            anomaly_type = 'spike'
        elif z_score < -z_threshold:
            anomaly_type = 'drop'
        else:
            anomaly_type = 'normal'
        
        if abs(z_score) > 3:
            severity = 'Severe'
        elif abs(z_score) > 2:
            severity = 'Warning'
        else:
            severity = 'Normal'
        
        result.append({
            'date': d['date'],
            'num_updates': d['num_updates'],
            'rolling_mean': round(mean, 2),
            'rolling_std': round(std, 2),
            'z_score': round(z_score, 2),
            'is_anomaly': is_anomaly,
            'anomaly_type': anomaly_type,
            'severity': severity
        })
    
    return result

def analyze_anomalies(request):
    data = load_csv_data()
    state = request.GET.get('state')
    district = request.GET.get('district')
    update_type = request.GET.get('update_type')
    window_size = int(request.GET.get('window_size', 7))
    z_threshold = float(request.GET.get('z_threshold', 2.0))
    
    if state:
        data = [d for d in data if d['state'] == state]
    if district:
        data = [d for d in data if d['district'] == district]
    if update_type and update_type != 'All':
        data = [d for d in data if d['update_type'] == update_type]
    
    analyzed = calculate_anomalies(data, window_size, z_threshold)
    return JsonResponse({'data': analyzed})
