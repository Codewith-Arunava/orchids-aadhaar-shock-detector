import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

# 1. Page Configuration
st.set_page_config(
    page_title="Aadhaar Update Shock Detector",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. Styling
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stAlert {
        border-radius: 10px;
    }
    .metric-card {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border: 1px solid #e9ecef;
    }
    </style>
    """, unsafe_allow_stdio=True)

# 3. Data Loading
@st.cache_data
def load_data():
    try:
        df = pd.read_csv('data/aadhaar_updates.csv')
        df['date'] = pd.to_datetime(df['date'])
        return df
    except Exception as e:
        st.error(f"Error loading data: {e}")
        st.stop()

df = load_data()

# 4. Sidebar Filters
st.sidebar.title("Filter Options")
selected_state = st.sidebar.selectbox("State", sorted(df['state'].unique()))
filtered_districts = df[df['state'] == selected_state]['district'].unique()
selected_district = st.sidebar.selectbox("District", sorted(filtered_districts))
selected_update_type = st.sidebar.selectbox("Update Type", sorted(df['update_type'].unique()))

# Filter Dataset
district_data = df[
    (df['state'] == selected_state) & 
    (df['district'] == selected_district) & 
    (df['update_type'] == selected_update_type)
].sort_values('date')

# 5. Anomaly Detection Logic
def detect_anomalies(data, z_threshold=2):
    # Establish baseline using 7-day rolling statistics
    data['rolling_mean'] = data['num_updates'].rolling(window=7, min_periods=1).mean()
    data['rolling_std'] = data['num_updates'].rolling(window=7, min_periods=1).std().fillna(0)
    
    # Calculate Z-Score
    # Prevent division by zero
    data['z_score'] = np.where(
        data['rolling_std'] > 0,
        (data['num_updates'] - data['rolling_mean']) / data['rolling_std'],
        0
    )
    
    data['anomaly'] = np.abs(data['z_score']) > z_threshold
    return data

processed_data = detect_anomalies(district_data)
latest_record = processed_data.iloc[-1] if not processed_data.empty else None

# 6. UI Components
st.title("🛡️ Aadhaar Update Shock Detector")
st.markdown("""
Identifying socio-economic and environmental shocks through statistically significant deviations 
in aggregated Aadhaar update activity.
""")

# Real-time Alert Section
if latest_record is not None:
    col1, col2, col3 = st.columns(3)
    
    z = latest_record['z_score']
    if abs(z) > 3:
        severity = "SEVERE"
        color = "red"
        icon = "🚨"
    elif abs(z) > 2:
        severity = "WARNING"
        color = "orange"
        icon = "⚠️"
    else:
        severity = "NORMAL"
        color = "green"
        icon = "✅"
    
    with col1:
        st.metric("Current Status", severity, delta=f"Z-Score: {z:.2f}", delta_color="inverse" if abs(z) > 2 else "normal")
    
    with col2:
        st.metric("Latest Update Count", int(latest_record['num_updates']))
        
    with col3:
        st.metric("District", selected_district)

    if severity != "NORMAL":
        direction = "spike" if z > 0 else "drop"
        st.error(f"{icon} **{severity} SHOCK DETECTED**: A significant {direction} in {selected_update_type} updates has been identified in {selected_district}.")

# 7. Visualization
st.subheader("Temporal Disruption Analysis")
fig = go.Figure()

# Actual Data
fig.add_trace(go.Scatter(
    x=processed_data['date'], 
    y=processed_data['num_updates'],
    name="Actual Updates",
    line=dict(color='#1f77b4', width=2)
))

# Baseline (Rolling Mean)
fig.add_trace(go.Scatter(
    x=processed_data['date'], 
    y=processed_data['rolling_mean'],
    name="Baseline (7d Rolling Mean)",
    line=dict(color='#ff7f0e', dash='dash')
))

# Highlight Anomalies
anomalies = processed_data[processed_data['anomaly']]
fig.add_trace(go.Scatter(
    x=anomalies['date'], 
    y=anomalies['num_updates'],
    mode='markers',
    name="Detected Shock",
    marker=dict(color='red', size=10, symbol='circle-x')
))

fig.update_layout(
    template="plotly_white",
    hovermode="x unified",
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    margin=dict(l=0, r=0, t=30, b=0)
)
st.plotly_chart(fig, use_container_width=True)

# 8. Interpretation Table
if not anomalies.empty:
    st.subheader("Shock Record & Interpretation")
    
    def interpret(row):
        z = row['z_score']
        if z > 0:
            return "Potential mass migration or relief-driven update surge."
        else:
            return "Potential service disruption or mass displacement event."

    display_df = anomalies[['date', 'num_updates', 'z_score']].copy()
    display_df['Interpretation'] = display_df.apply(interpret, axis=1)
    display_df['date'] = display_df['date'].dt.strftime('%Y-%m-%d')
    
    st.table(display_df)

# 9. Policy & Ethics Sections
st.divider()
col_left, col_right = st.columns(2)

with col_left:
    st.subheader("🎯 Policy Relevance")
    st.info("""
    - **Disaster Management:** Early response to floods, cyclones, and displacement.
    - **Economic Monitoring:** Detection of factory closures or seasonal migration waves.
    - **Coordination:** Improved resource allocation between UIDAI and state response agencies.
    """)

with col_right:
    st.subheader("🔒 Privacy & Ethics")
    st.warning("""
    - **Aggregation:** This system uses only anonymized, district-level aggregated counts.
    - **No PII:** No personal Aadhaar numbers or individual data points are processed.
    - **Compliance:** Designed to follow privacy-preserving principles of data minimization.
    """)

st.caption("Aadhaar Update Shock Detector | Powered by Streamlit & Plotly")
