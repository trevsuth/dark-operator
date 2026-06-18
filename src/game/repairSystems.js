const SYSTEM_ROOT = "/ship/systems";

const baselineOverrides = {
  sensors: {
    "arrays.tsv": "id\tstate\tangular_error\tdeployment\nARRAY-A\tonline\t0.2\tdeployed\nARRAY-B\tonline\t0.4\tdeployed\nMAST-C\tonline\t0.3\tdeployed\n",
  },
};

const faultFamilies = {
  coolant_phase: "thermal-control",
  rod_delay: "control-latency",
  thermal_override: "safety-override",
  relay_dropout: "power-routing",
  sensor_disagreement: "sensor-disagreement",
  scram_latch: "safety-interlock",
  coolant_contamination: "thermal-control",
  baseline_mismatch: "baseline-consistency",
  pressure_valve_open: "pressure-loss",
  scrubber_saturated: "atmosphere-processing",
  oxygen_mix: "atmosphere-mix",
  condenser_offline: "humidity-control",
  bad_atmosphere_sensor: "sensor-disagreement",
  biofilter_contamination: "contamination",
  loop_label: "route-labeling",
  atmosphere_baseline_mismatch: "baseline-consistency",
  lidar_alignment: "sensor-alignment",
  signal_filter: "signal-filtering",
  archive_bus: "archive-correlation",
  timebase_drift: "clock-drift",
  mast_shadowing: "sensor-occlusion",
  noise_model: "signal-filtering",
  rail_undervoltage: "power-quality",
  calibration_filter_mismatch: "baseline-consistency",
  index_corruption: "archive-index",
  checksum_mismatch: "archive-integrity",
  readonly_vault: "write-permission",
  duplicate_manifest: "archive-index",
  dust_gate: "contamination",
  manual_catalog: "catalog-routing",
  cold_storage: "storage-wake",
  manifest_index_mismatch: "baseline-consistency",
  thruster_imbalance: "thrust-balance",
  fuel_sensor_offset: "sensor-disagreement",
  route_table: "route-planning",
  radiator_lock: "thermal-control",
  reserve_leak: "pressure-loss",
  planner_checksum: "planner-integrity",
  drive_vibration: "mechanical-vibration",
  planner_config_mismatch: "baseline-consistency",
};

export const systemRepairModels = {
  reactor: {
    files: {
      "README.txt":
        "REACTOR REPAIR NOTES\n\nInspect config.ini, relays.tsv, coolant.tsv, and diagnostics/latest.txt.\nAfter correcting artifact faults, run repair reactor to validate the system.",
      "status.log":
        "2316-04-19T03:14:11Z reactor: reserve output stable\n2316-04-19T03:14:15Z reactor: thermal alarm channel armed\n",
      "faults.log": "No active reactor artifact faults recorded.\n",
      "config.ini":
        "rod_response_ms=80\nthermal_alarm=enabled\nthermal_limit_c=72\nscram_latch=clear\ncore_sensor_ignore=none\n",
      "relays.tsv": "id\tstate\troute\nRLY-A\tonline\tmain-bus\nRLY-B\tonline\tstandby-bus\n",
      "coolant.tsv": "id\tphase\tstate\tconductivity\nPUMP-A\t0\tonline\t0.12\nPUMP-B\t0\tonline\t0.13\nLOOP-A\t0\tprimary\t0.11\n",
      "diagnostics/latest.txt": "core_sensor_a=512\ncore_sensor_b=516\ncore_sensor_c=514\nclock=stable\n",
      "diagnostics/baseline.txt":
        "rod_response_ms=80\nthermal_alarm=enabled\nthermal_limit_c=72\npump_phase=0\nconductivity_max=0.20\n",
      "scripts/check.lua": "ship.print_status()\n",
      "scripts/repair.lua":
        "-- INCOMPLETE REACTOR REPAIR SCRIPT\n-- Compare /ship/systems/reactor/config.ini with /ship/baselines/reactor/config.ini.\n-- Then inspect coolant.tsv and relays.tsv before running repair reactor.\nprint('reactor repair script incomplete: inspect config, coolant, relays')\n",
    },
    faults: [
      fault("coolant_phase", "Coolant pump phase mismatch", "coolant.tsv", "Set all coolant pump phase values to 0.", (files) =>
        /PUMP-[A-Z]\t(?!0\b)\d+/.test(files["coolant.tsv"] || "")),
      fault("rod_delay", "Control rod response delay", "config.ini", "Set rod_response_ms to 120 or lower.", (files) =>
        Number(readKey(files["config.ini"], "rod_response_ms")) > 120),
      fault("thermal_override", "Thermal threshold override", "config.ini", "Set thermal_alarm=enabled and thermal_limit_c at or below 80.", (files) =>
        readKey(files["config.ini"], "thermal_alarm") !== "enabled" || Number(readKey(files["config.ini"], "thermal_limit_c")) > 80),
      fault("relay_dropout", "Relay bus dropout", "relays.tsv", "Restore relay rows to state=online.", (files) =>
        /\toffline\t/.test(files["relays.tsv"] || "")),
      fault("sensor_disagreement", "Core sensor disagreement", "diagnostics/latest.txt", "Recalibrate core sensors or set core_sensor_ignore to the outlier.", (files) => {
        const values = ["core_sensor_a", "core_sensor_b", "core_sensor_c"].map((key) => Number(readKey(files["diagnostics/latest.txt"], key)));
        return values.some(Number.isFinite) && Math.max(...values) - Math.min(...values) > 40;
      }),
      fault("scram_latch", "Emergency scram latch stuck", "config.ini", "Set scram_latch=clear after confirming heat is safe.", (files) =>
        readKey(files["config.ini"], "scram_latch") !== "clear"),
      fault("coolant_contamination", "Coolant contamination", "coolant.tsv", "Reduce coolant conductivity below 0.20 or switch to a clean loop.", (files) =>
        tableRows(files["coolant.tsv"]).some((row) => Number(row.conductivity) > 0.2)),
      fault("baseline_mismatch", "Reactor baseline mismatch", "config.ini", "Make config.ini match diagnostics/baseline.txt for rod response and thermal alarm values.", (files) =>
        readKey(files["config.ini"], "rod_response_ms") !== readKey(files["diagnostics/baseline.txt"], "rod_response_ms") ||
        readKey(files["config.ini"], "thermal_alarm") !== readKey(files["diagnostics/baseline.txt"], "thermal_alarm") ||
        readKey(files["config.ini"], "thermal_limit_c") !== readKey(files["diagnostics/baseline.txt"], "thermal_limit_c")),
    ],
  },
  life_support: {
    files: {
      "README.txt":
        "LIFE SUPPORT REPAIR NOTES\n\nInspect valves.tsv, scrubbers.tsv, atmosphere.tsv, and config.ini.\nPay attention to Loop B labels in archived maintenance records.",
      "status.log":
        "2316-04-19T03:14:21Z life_support: loop B pressure within emergency band\n2316-04-19T03:14:22Z life_support: scrubber bank A active\n",
      "faults.log": "No active life support artifact faults recorded.\n",
      "config.ini": "target_o2_percent=20.8\nloop_b_label=loop-b\nbiofilter_bed=primary\n",
      "valves.tsv": "id\tposition\troute\nVALVE-A\tregulated\tloop-a\nVALVE-B\tregulated\tloop-b\nCOND-A\tregulated\tloop-b\n",
      "scrubbers.tsv": "id\tstate\tcapacity\nBANK-A\tactive\t84\nBANK-B\tstandby\t72\n",
      "atmosphere.tsv": "sensor\tpressure_kpa\to2_percent\nATM-A\t99.1\t20.8\nATM-B\t99.0\t20.7\nATM-C\t99.2\t20.8\n",
      "diagnostics/latest.txt": "pressure_variance=0.2\nco2_scrub_rate=nominal\nhumidity_condenser=online\n",
      "diagnostics/baseline.txt": "target_o2_percent=20.8\npressure_kpa=99.1\nscrubber_capacity_min=20\n",
      "scripts/check.lua": "local s = ship.status()\nprint(s.environment.pressureKpa)\nprint(s.environment.co2Ppm)\n",
      "scripts/repair.lua":
        "-- INCOMPLETE LIFE SUPPORT REPAIR SCRIPT\n-- TODO: verify valves.tsv, scrubbers.tsv, atmosphere.tsv, and config.ini agree.\nprint('life support repair script incomplete: inspect valves, scrubbers, atmosphere')\n",
    },
    faults: [
      fault("pressure_valve_open", "Pressure valve stuck open", "valves.tsv", "Set pressure valves to position=regulated.", (files) =>
        tableRows(files["valves.tsv"]).some((row) => row.id?.startsWith("VALVE") && row.position === "open")),
      fault("scrubber_saturated", "CO2 scrubber saturated", "scrubbers.tsv", "Switch to a scrubber bank with capacity above 20.", (files) =>
        tableRows(files["scrubbers.tsv"]).some((row) => row.state === "active" && Number(row.capacity) < 20)),
      fault("oxygen_mix", "Oxygen mix ratio corrupted", "config.ini", "Restore target_o2_percent to 20.8.", (files) =>
        Number(readKey(files["config.ini"], "target_o2_percent")) !== 20.8),
      fault("condenser_offline", "Humidity condenser offline", "diagnostics/latest.txt", "Restore humidity_condenser=online.", (files) =>
        readKey(files["diagnostics/latest.txt"], "humidity_condenser") !== "online"),
      fault("bad_atmosphere_sensor", "Bad atmosphere sensor", "atmosphere.tsv", "Recalibrate atmosphere sensors to plausible pressure and oxygen values.", (files) =>
        tableRows(files["atmosphere.tsv"]).some((row) => Number(row.pressure_kpa) < 80 || Number(row.pressure_kpa) > 110 || Number(row.o2_percent) < 18 || Number(row.o2_percent) > 23)),
      fault("biofilter_contamination", "Biofilter contamination", "config.ini", "Set biofilter_bed to primary or clean.", (files) =>
        ["contaminated", "fouled"].includes(readKey(files["config.ini"], "biofilter_bed"))),
      fault("loop_label", "Loop B mislabeled route", "config.ini", "Restore loop_b_label=loop-b.", (files) =>
        readKey(files["config.ini"], "loop_b_label") !== "loop-b"),
      fault("atmosphere_baseline_mismatch", "Atmosphere baseline mismatch", "config.ini", "Make config.ini target_o2_percent and atmosphere.tsv sensor averages agree with diagnostics/baseline.txt.", (files) =>
        Number(readKey(files["config.ini"], "target_o2_percent")) !== Number(readKey(files["diagnostics/baseline.txt"], "target_o2_percent")) ||
        Math.abs(average(tableRows(files["atmosphere.tsv"]).map((row) => Number(row.pressure_kpa))) - Number(readKey(files["diagnostics/baseline.txt"], "pressure_kpa"))) > 1 ||
        Math.abs(average(tableRows(files["atmosphere.tsv"]).map((row) => Number(row.o2_percent))) - Number(readKey(files["diagnostics/baseline.txt"], "target_o2_percent"))) > 0.5),
    ],
  },
  sensors: {
    files: {
      "README.txt":
        "SENSORS REPAIR NOTES\n\nInspect arrays.tsv, filters.ini, calibration.dat, and diagnostics/latest.txt.\nThe current boot defect is consistent with lidar array misalignment.",
      "status.log":
        "2316-04-19T03:14:33Z sensors: lidar array B angular error above tolerance\n2316-04-19T03:14:35Z sensors: archive correlation bus online\n",
      "faults.log": "ACTIVE lidar array misalignment: ARRAY-B angular_error=3.4\n",
      "config.ini": "archive_bus=online\ntimebase_source=master\nrail_assignment=main\n",
      "arrays.tsv": "id\tstate\tangular_error\tdeployment\nARRAY-A\tonline\t0.2\tdeployed\nARRAY-B\tonline\t3.4\tdeployed\nMAST-C\tonline\t0.3\tdeployed\n",
      "calibration.dat": "noise_model=simurgh-default\nlast_calibration=2316-04-18\n",
      "filters.ini": "minimum_signal=8\nnoise_model=simurgh-default\n",
      "diagnostics/latest.txt": "clock_skew_ms=12\nrail_voltage=11.8\narchive_bus_latency=31\n",
      "diagnostics/baseline.txt": "angular_error_max=1.0\nminimum_signal=8\nclock_skew_ms_max=50\nrail_voltage_min=11.2\n",
      "scripts/check.lua": "ship.scan()\n",
      "scripts/repair.lua":
        "-- INCOMPLETE SENSOR REPAIR SCRIPT\nlocal arrays = fs.read('/ship/systems/sensors/arrays.tsv')\nprint(arrays)\nprint('TODO: compare angular_error values with /ship/baselines/sensors/arrays.tsv')\n",
    },
    faults: [
      fault("lidar_alignment", "Lidar array misalignment", "arrays.tsv", "Reduce angular_error values to 1.0 or lower.", (files) =>
        tableRows(files["arrays.tsv"]).some((row) => Number(row.angular_error) > 1)),
      fault("signal_filter", "Signal filter too aggressive", "filters.ini", "Set minimum_signal to 12 or lower.", (files) =>
        Number(readKey(files["filters.ini"], "minimum_signal")) > 12),
      fault("archive_bus", "Archive correlation bus disconnected", "config.ini", "Set archive_bus=online.", (files) =>
        readKey(files["config.ini"], "archive_bus") !== "online"),
      fault("timebase_drift", "Timebase drift", "diagnostics/latest.txt", "Set timebase_source=master and reduce clock_skew_ms below 50.", (files) =>
        Number(readKey(files["diagnostics/latest.txt"], "clock_skew_ms")) > 50),
      fault("mast_shadowing", "Antenna mast shadowing", "arrays.tsv", "Set mast deployment to deployed or route around the mast.", (files) =>
        tableRows(files["arrays.tsv"]).some((row) => row.id?.startsWith("MAST") && row.deployment !== "deployed")),
      fault("noise_model", "Noise model corruption", "filters.ini", "Restore noise_model=simurgh-default.", (files) =>
        readKey(files["filters.ini"], "noise_model") !== "simurgh-default"),
      fault("rail_undervoltage", "Sensor power rail undervoltage", "diagnostics/latest.txt", "Restore rail voltage to 11.2 or higher.", (files) =>
        Number(readKey(files["diagnostics/latest.txt"], "rail_voltage")) < 11.2),
      fault("calibration_filter_mismatch", "Calibration filter mismatch", "filters.ini", "Make filters.ini match calibration.dat and diagnostics/baseline.txt.", (files) =>
        readKey(files["filters.ini"], "noise_model") !== readKey(files["calibration.dat"], "noise_model") ||
        Number(readKey(files["filters.ini"], "minimum_signal")) !== Number(readKey(files["diagnostics/baseline.txt"], "minimum_signal"))),
    ],
  },
  archives: {
    files: {
      "README.txt": "ARCHIVES REPAIR NOTES\n\nInspect index.map, manifest.tsv, checksum.txt, and config.ini.",
      "status.log": "2316-04-19T03:14:41Z archives: index service available\n",
      "faults.log": "No active archive artifact faults recorded.\n",
      "config.ini": "vault_mode=emergency-write\ndust_gate=closed\nmanual_catalog=/archive/manuals/lua\ncold_storage_bank=awake\n",
      "index.map": "archive-ash=offset-120\ncrew-channel=offset-240\ngarden-vault=offset-360\ncaptain-index=offset-480\n",
      "manifest.tsv": "id\toffset\tstate\narchive-ash\toffset-120\tactive\ncrew-channel\toffset-240\tactive\ngarden-vault\toffset-360\tactive\ncaptain-index\toffset-480\tactive\n",
      "checksum.txt": "manifest_checksum=ok\n",
      "diagnostics/latest.txt": "index_duplicates=0\ncold_storage=awake\ncatalog_resolved=true\n",
      "diagnostics/baseline.txt": "manifest_checksum=ok\nvault_mode=emergency-write\ndust_gate=closed\n",
      "scripts/check.lua": "local files = fs.list('/archive/manuals/lua')\nfor _, file in ipairs(files) do print(file) end\n",
      "scripts/repair.lua":
        "-- INCOMPLETE ARCHIVE REPAIR SCRIPT\n-- TODO: compare index.map with manifest.tsv and confirm checksum.txt.\nprint('archive repair script incomplete: inspect index, manifest, checksum')\n",
    },
    faults: [
      fault("index_corruption", "Index map corruption", "index.map", "Ensure each archive id has a unique offset.", (files) => hasDuplicateValues(keyValueLines(files["index.map"]))),
      fault("checksum_mismatch", "Manifest checksum mismatch", "checksum.txt", "Set manifest_checksum=ok after confirming manifest rows.", (files) =>
        readKey(files["checksum.txt"], "manifest_checksum") !== "ok"),
      fault("readonly_vault", "Read-only vault flag stuck", "config.ini", "Set vault_mode=emergency-write.", (files) =>
        readKey(files["config.ini"], "vault_mode") === "readonly"),
      fault("duplicate_manifest", "Duplicate crew index entries", "manifest.tsv", "Remove duplicate manifest ids.", (files) => hasDuplicateValues(tableRows(files["manifest.tsv"]).map((row) => row.id))),
      fault("dust_gate", "Dust intrusion in archive spine", "config.ini", "Set dust_gate=closed.", (files) =>
        readKey(files["config.ini"], "dust_gate") !== "closed"),
      fault("manual_catalog", "Manual catalog path broken", "config.ini", "Restore manual_catalog=/archive/manuals/lua.", (files) =>
        readKey(files["config.ini"], "manual_catalog") !== "/archive/manuals/lua"),
      fault("cold_storage", "Cold storage wake failure", "config.ini", "Set cold_storage_bank=awake.", (files) =>
        readKey(files["config.ini"], "cold_storage_bank") !== "awake"),
      fault("manifest_index_mismatch", "Manifest/index offset mismatch", "manifest.tsv", "Make manifest.tsv offsets match index.map for every archive id.", (files) => {
        const index = Object.fromEntries(
          String(files["index.map"] || "")
            .split("\n")
            .filter((line) => line.includes("="))
            .map((line) => line.split("=")),
        );
        return tableRows(files["manifest.tsv"]).some((row) => index[row.id] !== row.offset);
      }),
    ],
  },
  propulsion: {
    files: {
      "README.txt": "PROPULSION REPAIR NOTES\n\nInspect thrusters.tsv, fuel.tsv, routes.tsv, and config.ini.",
      "status.log": "2316-04-19T03:14:52Z propulsion: burn planner ready\n2316-04-19T03:14:53Z propulsion: radiator gimbal clear\n",
      "faults.log": "No active propulsion artifact faults recorded.\n",
      "config.ini": "radiator_gimbal=clear\nburn_profile=standard\nplanner_checksum=ok\nactive_tank=main\n",
      "thrusters.tsv": "id\tstate\taperture\tvibration\nTHR-A\tonline\t50\t0.2\nTHR-B\tonline\t50\t0.3\n",
      "fuel.tsv": "tank\tstate\tpressure_loss\tsensor_offset\nmain\tactive\t0\t0\nreserve\tstandby\t0\t0\n",
      "routes.tsv": "from\tto\tstate\nsector-01\tsector-02\topen\nsector-01\tsector-03\topen\n",
      "diagnostics/latest.txt": "burn_planner_checksum=ok\ntruss_vibration=0.3\nfuel_sensor_offset=0\n",
      "diagnostics/baseline.txt": "aperture=50\npressure_loss=0\nplanner_checksum=ok\nvibration_max=1.0\n",
      "scripts/check.lua": "ship.print_status()\n",
      "scripts/repair.lua":
        "-- INCOMPLETE PROPULSION REPAIR SCRIPT\n-- TODO: verify active_tank, fuel.tsv, thrusters.tsv, and diagnostics/latest.txt agree.\nprint('propulsion repair script incomplete: inspect fuel, thrusters, planner')\n",
    },
    faults: [
      fault("thruster_imbalance", "Thruster valve imbalance", "thrusters.tsv", "Normalize thruster aperture values within 5 units.", (files) => {
        const apertures = tableRows(files["thrusters.tsv"]).map((row) => Number(row.aperture)).filter(Number.isFinite);
        return apertures.length > 1 && Math.max(...apertures) - Math.min(...apertures) > 5;
      }),
      fault("fuel_sensor_offset", "Fuel reserve sensor offset", "fuel.tsv", "Set fuel sensor offsets between -2 and 2.", (files) =>
        tableRows(files["fuel.tsv"]).some((row) => Math.abs(Number(row.sensor_offset)) > 2)),
      fault("route_table", "Route table stale", "routes.tsv", "Keep current route rows open for known adjacent sectors.", (files) =>
        !/sector-01\tsector-02\topen/.test(files["routes.tsv"] || "")),
      fault("radiator_lock", "Radiator orientation lock", "config.ini", "Set radiator_gimbal=clear.", (files) =>
        readKey(files["config.ini"], "radiator_gimbal") !== "clear"),
      fault("reserve_leak", "Maneuvering reserve leak", "fuel.tsv", "Set pressure_loss to 0 or isolate the leaking tank.", (files) =>
        tableRows(files["fuel.tsv"]).some((row) => Number(row.pressure_loss) > 0)),
      fault("planner_checksum", "Burn planner checksum error", "diagnostics/latest.txt", "Set burn_planner_checksum=ok.", (files) =>
        readKey(files["diagnostics/latest.txt"], "burn_planner_checksum") !== "ok"),
      fault("drive_vibration", "Drive truss vibration", "thrusters.tsv", "Reduce truss vibration below 1.0.", (files) =>
        tableRows(files["thrusters.tsv"]).some((row) => Number(row.vibration) > 1)),
      fault("planner_config_mismatch", "Planner configuration mismatch", "config.ini", "Make config.ini planner_checksum and active_tank agree with diagnostics/latest.txt and fuel.tsv.", (files) =>
        readKey(files["config.ini"], "planner_checksum") !== readKey(files["diagnostics/latest.txt"], "burn_planner_checksum") ||
        !tableRows(files["fuel.tsv"]).some((row) => row.tank === readKey(files["config.ini"], "active_tank") && row.state === "active")),
    ],
  },
};

export function createSystemFileTree() {
  return {
    type: "directory",
    children: Object.fromEntries(
      Object.entries(systemRepairModels).map(([system, model]) => [system, directoryFromFiles(model.files)]),
    ),
  };
}

export function createSystemBaselineTree() {
  return {
    type: "directory",
    children: Object.fromEntries(
      Object.entries(systemRepairModels).map(([system, model]) => [system, directoryFromFiles(createBaselineFiles(system, model.files))]),
    ),
  };
}

export function analyzeSystemFaults(system, fileSystemRoot) {
  const model = systemRepairModels[system];
  if (!model) return [];

  const files = readSystemFiles(system, fileSystemRoot, model.files);
  return model.faults
    .filter((candidate) => candidate.check(files))
    .map(({ check, ...faultInfo }) => faultInfo);
}

export function getSystemArtifactPaths(system) {
  const model = systemRepairModels[system];
  if (!model) return [];
  return Object.keys(model.files).map((path) => `${SYSTEM_ROOT}/${system}/${path}`);
}

export function getSystemRoot(system) {
  return `${SYSTEM_ROOT}/${system}`;
}

function fault(id, title, file, repair, check) {
  return { id, title, family: faultFamilies[id] || "general", file: `${SYSTEM_ROOT}/SYSTEM/${file}`, repair, check };
}

function readSystemFiles(system, root, files) {
  return Object.fromEntries(
    Object.keys(files).map((path) => [path, readVirtualFile(root, `${SYSTEM_ROOT}/${system}/${path}`) ?? ""]),
  );
}

function readVirtualFile(root, path) {
  const parts = path.split("/").filter(Boolean);
  let node = root;
  for (const part of parts) {
    if (!node || node.type !== "directory") return null;
    node = node.children[part];
  }
  return node?.type === "file" ? node.content : null;
}

function createBaselineFiles(system, files) {
  const stableFiles = {
    ...Object.fromEntries(
      Object.entries(files)
        .filter(([path]) => !path.endsWith("status.log") && !path.endsWith("faults.log") && !path.startsWith("scripts/") && path !== "README.txt"),
    ),
    ...(baselineOverrides[system] || {}),
  };

  return {
    "README.txt": `${system.toUpperCase()} BASELINE SNAPSHOT\n\nThese files represent the expected clean artifact state for ${system}.\nCompare them with /ship/systems/${system} when diagnosing multi-file repairs.\nVolatile status.log, faults.log, and scripts are intentionally excluded.\n`,
    ...stableFiles,
  };
}

function directoryFromFiles(files) {
  const root = { type: "directory", children: {} };

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/");
    let directory = root;
    for (const part of parts.slice(0, -1)) {
      directory.children[part] ||= { type: "directory", children: {} };
      directory = directory.children[part];
    }
    directory.children[parts.at(-1)] = { type: "file", content };
  }

  return root;
}

function readKey(content, key) {
  const line = String(content)
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
}

function tableRows(content) {
  const lines = String(content)
    .trim()
    .split("\n")
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((value, index) => [headers[index], value])));
}

function keyValueLines(content) {
  return String(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("=")[1])
    .filter(Boolean);
}

function hasDuplicateValues(values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function average(values) {
  const numbers = values.filter(Number.isFinite);
  if (!numbers.length) return Number.NaN;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}
