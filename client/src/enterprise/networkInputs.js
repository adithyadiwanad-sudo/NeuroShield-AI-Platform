export const flowFields = [
  "Destination_Port",
  "Flow_Duration",
  "Total_Fwd_Packets",
  "Total_Bwd_Packets",
  "Flow_Bytes_s",
  "Flow_Packets_s",
  "SYN_Flag_Count",
  "ACK_Flag_Count",
];
export const flowPresets = {
  "Normal traffic": [443, 15000, 25, 30, 380, 3.6, 1, 1],
  "SYN flood": [80, 500, 850, 2, 100000, 1700, 1, 0],
  "Traffic spike": [8080, 1000, 600, 500, 120000, 1100, 1, 1],
};
export function presetFlow(name) {
  return Object.fromEntries(
    flowFields.map((key, i) => [key, flowPresets[name][i]]),
  );
}
export function sampleCsv() {
  return [
    flowFields.join(","),
    ...Object.values(flowPresets).map((row) => row.join(",")),
  ].join("\n");
}
export function parseFlows(csv) {
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2 || lines.length > 101)
    throw new Error("Provide a header and 1–100 numeric flow rows.");
  const headers = lines[0]
    .split(",")
    .map((v) => v.trim().replace(/^"|"$/g, ""));
  if (new Set(headers).size !== headers.length)
    throw new Error("Duplicate CSV columns are not allowed.");
  const missing = flowFields.filter((f) => !headers.includes(f));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.length !== headers.length)
      throw new Error(`Row ${index + 2}: column count does not match header.`);
    return Object.fromEntries(
      flowFields.map((field) => {
        const raw = values[headers.indexOf(field)],
          value = Number(raw);
        if (!raw || !Number.isFinite(value) || value < 0)
          throw new Error(
            `Row ${index + 2}: ${field} must be a non-negative number.`,
          );
        return [field, value];
      }),
    );
  });
}
