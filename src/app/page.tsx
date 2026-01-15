"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ComposedChart,
} from "recharts";
import { Slider } from "@/components/ui/slider";

interface AnalyzedData {
  date: string;
  num_updates: number;
  rolling_mean: number;
  rolling_std: number;
  z_score: number;
  is_anomaly: boolean;
  anomaly_type: "spike" | "drop" | "normal";
  severity: "Severe" | "Warning" | "Normal";
}

function getInterpretation(row: AnalyzedData): string {
  if (row.anomaly_type === "spike") {
    if (row.severity === "Severe") {
      return `SEVERE SPIKE: Detected ${row.num_updates.toLocaleString()} updates vs baseline ${Math.round(row.rolling_mean).toLocaleString()}. Possible causes: Mass migration event, relief camp registrations, or post-disaster identity restoration drive.`;
    }
    return `WARNING SPIKE: Elevated activity (${row.num_updates.toLocaleString()} vs baseline ${Math.round(row.rolling_mean).toLocaleString()}). Monitor for continued elevation - may indicate emerging displacement or economic migration.`;
  } else if (row.anomaly_type === "drop") {
    if (row.severity === "Severe") {
      return `SEVERE DROP: Only ${row.num_updates.toLocaleString()} updates vs baseline ${Math.round(row.rolling_mean).toLocaleString()}. Critical disruption likely - possible natural disaster, infrastructure failure, or mass displacement from the area.`;
    }
    return `WARNING DROP: Reduced activity (${row.num_updates.toLocaleString()} vs baseline ${Math.round(row.rolling_mean).toLocaleString()}). Possible service disruption or localized event affecting Aadhaar centers.`;
  }
  return "Normal activity levels within expected range.";
}

const chartConfig = {
  num_updates: {
    label: "Updates",
    color: "#60a5fa",
  },
  rolling_mean: {
    label: "Baseline",
    color: "#94a3b8",
  },
};

export default function Home() {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [updateTypes, setUpdateTypes] = useState<string[]>(["All"]);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUpdateType, setSelectedUpdateType] = useState("All");
  const [windowSize, setWindowSize] = useState(7);
  const [zThreshold, setZThreshold] = useState(2.0);

  useEffect(() => {
    async function fetchStates() {
      try {
        const res = await fetch("/api/aadhaar/states");
        const data = await res.json();
        setStates(data.states || []);
        if (data.states?.length > 0 && !selectedState) {
          setSelectedState(data.states[0]);
        }
      } catch (err) {
        console.error("Failed to fetch states:", err);
      }
    }
    fetchStates();
  }, []);

  useEffect(() => {
    async function fetchDistricts() {
      if (!selectedState) return;
      try {
        const res = await fetch(`/api/aadhaar/districts/${encodeURIComponent(selectedState)}`);
        const data = await res.json();
        setDistricts(data.districts || []);
        if (data.districts?.length > 0) {
          setSelectedDistrict(data.districts[0]);
        }
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      }
    }
    fetchDistricts();
  }, [selectedState]);

  useEffect(() => {
    async function fetchUpdateTypes() {
      try {
        const res = await fetch("/api/aadhaar/update-types");
        const data = await res.json();
        setUpdateTypes(data.update_types || ["All"]);
      } catch (err) {
        console.error("Failed to fetch update types:", err);
      }
    }
    fetchUpdateTypes();
  }, []);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!selectedState || !selectedDistrict) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          state: selectedState,
          district: selectedDistrict,
          update_type: selectedUpdateType,
          window_size: windowSize.toString(),
          z_threshold: zThreshold.toString(),
        });
        const res = await fetch(`/api/aadhaar/analyze?${params}`);
        const data = await res.json();
        setAnalyzedData(data.data || []);
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [selectedState, selectedDistrict, selectedUpdateType, windowSize, zThreshold]);

  const totalUpdates = analyzedData.reduce((a, b) => a + b.num_updates, 0);
  const avgUpdates = totalUpdates / (analyzedData.length || 1);
  const totalAnomalies = analyzedData.filter((d) => d.is_anomaly).length;
  const latestRow = analyzedData[analyzedData.length - 1];
  const latestStatus = latestRow?.severity || "Normal";

  const anomalyRecords = analyzedData.filter((d) => d.is_anomaly);

  const chartData = analyzedData.map((d) => ({
    ...d,
    displayDate: d.date.slice(5),
    spikeValue: d.anomaly_type === "spike" ? d.num_updates : null,
    dropValue: d.anomaly_type === "drop" ? d.num_updates : null,
  }));

  return (
    <div className="min-h-screen bg-[#0a0d12] text-gray-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex">
        <aside className="w-72 min-h-screen bg-[#0f1318] border-r border-gray-800/50 p-6 flex flex-col gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Filters</h2>
            <div className="h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide">State</label>
              <Select value={selectedState} onValueChange={(v) => setSelectedState(v)}>
                <SelectTrigger className="w-full bg-gray-900/50 border-gray-700">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide">District</label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-full bg-gray-900/50 border-gray-700">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Update Type</label>
              <Select value={selectedUpdateType} onValueChange={setSelectedUpdateType}>
                <SelectTrigger className="w-full bg-gray-900/50 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {updateTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1 pt-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Detection Settings</h2>
            <div className="h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Baseline Window</label>
                <span className="text-sm font-mono text-indigo-400">{windowSize} days</span>
              </div>
              <Slider
                value={[windowSize]}
                onValueChange={(v) => setWindowSize(v[0])}
                min={3}
                max={14}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Z-Score Threshold</label>
                <span className="text-sm font-mono text-indigo-400">{zThreshold.toFixed(1)}</span>
              </div>
              <Slider
                value={[zThreshold]}
                onValueChange={(v) => setZThreshold(v[0])}
                min={1.5}
                max={4.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-auto p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-indigo-300 uppercase">Privacy & Ethics</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Only aggregated district-level data used. No personal Aadhaar information processed. Fully privacy-preserving design.
            </p>
          </div>

          <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-300">Django Backend Connected</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              Aadhaar Update Shock Detector
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Privacy-preserving early warning system detecting socio-economic and environmental shocks through district-level Aadhaar update pattern analysis. Powered by Django backend.
            </p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-indigo-400">{totalUpdates.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Total Updates</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-indigo-400">{Math.round(avgUpdates).toLocaleString()}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Daily Average</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-amber-400">{totalAnomalies}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Anomalies Detected</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="pt-6">
                    <div className={`text-2xl font-bold ${latestStatus === "Normal" ? "text-emerald-400" : latestStatus === "Warning" ? "text-amber-400" : "text-rose-400"}`}>
                      {latestStatus}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Current Status</div>
                  </CardContent>
                </Card>
              </div>

              {latestRow && (
                <div className={`p-4 rounded-lg border mb-6 ${
                  latestRow.severity === "Severe" 
                    ? "bg-rose-900/20 border-rose-500/50 text-rose-200" 
                    : latestRow.severity === "Warning"
                    ? "bg-amber-900/20 border-amber-500/50 text-amber-200"
                    : "bg-emerald-900/20 border-emerald-500/50 text-emerald-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {latestRow.severity === "Severe" ? "🚨" : latestRow.severity === "Warning" ? "⚠️" : "✅"}
                    </span>
                    <span className="font-semibold">District Alert: {selectedDistrict}, {selectedState}</span>
                  </div>
                  <p className="text-sm mt-1 opacity-90">
                    Latest reading: {latestRow.num_updates.toLocaleString()} updates | Z-Score: {latestRow.z_score.toFixed(2)} | Status: {latestRow.severity}
                  </p>
                </div>
              )}

              <Card className="bg-gray-900/50 border-gray-800 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-200">
                    Update Activity - {selectedDistrict}, {selectedState} ({selectedUpdateType})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="displayDate" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="num_updates"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#60a5fa" }}
                        name="Updates"
                      />
                      <Line
                        type="monotone"
                        dataKey="rolling_mean"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Baseline"
                      />
                      <Scatter
                        dataKey="spikeValue"
                        fill="#f87171"
                        shape="triangle"
                        name="Spike"
                      />
                      <Scatter
                        dataKey="dropValue"
                        fill="#fbbf24"
                        shape="diamond"
                        name="Drop"
                      />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {anomalyRecords.length > 0 && (
                <>
                  <Card className="bg-gray-900/50 border-gray-800 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-200">Anomaly Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Updates</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Baseline</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Z-Score</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">Severity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anomalyRecords.map((row, i) => (
                              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="py-3 px-4 text-gray-300">{row.date}</td>
                                <td className="py-3 px-4 text-indigo-400 font-mono">{row.num_updates.toLocaleString()}</td>
                                <td className="py-3 px-4 text-gray-400 font-mono">{Math.round(row.rolling_mean).toLocaleString()}</td>
                                <td className="py-3 px-4 text-gray-300 font-mono">{row.z_score.toFixed(2)}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    row.anomaly_type === "spike" ? "bg-rose-900/50 text-rose-300" : "bg-amber-900/50 text-amber-300"
                                  }`}>
                                    {row.anomaly_type}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    row.severity === "Severe" ? "bg-rose-900/50 text-rose-300" : "bg-amber-900/50 text-amber-300"
                                  }`}>
                                    {row.severity}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-200">Automated Interpretation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {anomalyRecords.map((row, i) => (
                        <div key={i} className="p-4 bg-gray-800/30 rounded-lg border-l-4 border-purple-500">
                          <div className="text-sm font-semibold text-purple-300 mb-1">{row.date}</div>
                          <p className="text-sm text-gray-300">
                            {row.anomaly_type === "spike" && row.severity === "Severe" && "🚨 "}
                            {row.anomaly_type === "spike" && row.severity === "Warning" && "⚠️ "}
                            {row.anomaly_type === "drop" && row.severity === "Severe" && "🚨 "}
                            {row.anomaly_type === "drop" && row.severity === "Warning" && "⚠️ "}
                            {getInterpretation(row)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {anomalyRecords.length === 0 && (
                <div className="p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-lg text-emerald-200 mb-6">
                  ✅ No anomalies detected in the selected time period. All activity levels are within normal range.
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: "🌊", title: "Disaster Response", text: "Early detection of floods, cyclones, and natural disasters through sudden drops in update activity, enabling faster emergency response coordination." },
                  { icon: "💼", title: "Economic Monitoring", text: "Identification of economic shocks such as factory closures or migration waves through unusual patterns in address update requests." },
                  { icon: "🤝", title: "Agency Coordination", text: "Improved coordination between UIDAI and disaster-response agencies through real-time anomaly alerts and severity indicators." },
                ].map((item, i) => (
                  <Card key={i} className="bg-gray-900/50 border-gray-800">
                    <CardContent className="pt-6">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h3 className="font-semibold text-gray-200 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-400">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <footer className="mt-12 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm">
              Aadhaar Update Shock Detector | Privacy-Preserving Early Warning System | Django + Next.js
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
