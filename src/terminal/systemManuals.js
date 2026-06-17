const SYSTEM_MANUALS = {
  reactor: {
    "00_index.txt": `CSV SIMURGH SERVICE MANUAL
REACTOR SYSTEM INDEX

Manual group: /archive/manuals/reactor
System path:  /ship/systems/reactor

Files:
  service_manual.txt       Full operating model and safety notes.
  components.txt           Component inventory and normal ranges.
  diagrams.txt             Simplified reactor and coolant diagrams.
  fault_procedures.txt     Known fault signatures and correction workflow.
  calibration_notes.txt    Calibration values and sensor relationships.
  maintenance.log          Historical service excerpts.
  field_notes.txt          Informal engineering observations.
`,
    "service_manual.txt": `CSV SIMURGH REACTOR SERVICE MANUAL
REVISION 44.12 / EMERGENCY COPY

1. PURPOSE

The reactor system maintains electrical reserves for the vessel grid and
supplies regulated waste heat to thermal exchange loops. It is not a single
device. It is a distributed core, rod actuator bank, relay lattice, coolant
manifold, and thermal alarm channel.

The operator usually sees only:

  power reserve
  heat load
  reactor allocation
  system state

These are summaries. Repairs must be made by inspecting artifacts under:

  /ship/systems/reactor

2. OPERATING PRINCIPLES

The reactor control loop is conservative. A small reserve gain is preferred to
large output changes. Rod response should remain under 120 ms. Coolant pump
phase must remain synchronized at phase 0 unless a pump is explicitly isolated.

Normal emergency values:

  rod_response_ms       80
  thermal_alarm         enabled
  thermal_limit_c       72
  scram_latch           clear
  pump_phase            0
  coolant_conductivity  <= 0.20

3. SERVICE WARNING

Do not clear a scram latch only because power reserve is low. Confirm heat,
coolant phase, and thermal alarm channel first. A cleared latch with a disabled
thermal alarm can make the core appear repaired until the radiator loop falls
behind.
`,
    "components.txt": `REACTOR COMPONENT INVENTORY

CORE-RING-A
  Function: primary plasma containment and conversion lattice.
  Expected: stable core sensor spread below 40 counts.

ROD-ACTUATOR-BANK
  Function: mechanical damping and output control.
  Expected: rod_response_ms <= 120.

RELAY-LATTICE
  Function: routes output to main and standby grid buses.
  Expected: all listed relays state=online.

COOLANT-MANIFOLD
  Function: moves heat to radiator exchange loops.
  Expected: pump phase 0, conductivity <= 0.20.

THERMAL-ALARM-CHANNEL
  Function: produces warnings before reactor heat exceeds safe band.
  Expected: thermal_alarm=enabled, thermal_limit_c <= 80.
`,
    "diagrams.txt": `REACTOR POWER AND COOLANT FLOW

        +-------------------+
        |  CORE-RING-A      |
        |  sensor A/B/C     |
        +---------+---------+
                  |
          rod actuator bank
                  |
        +---------v---------+
        | RELAY LATTICE     |
        | RLY-A -> main     |
        | RLY-B -> standby  |
        +---------+---------+
                  |
          ship electrical bus

COOLANT PATH

   PUMP-A phase 0 ----+
                      +---- LOOP-A primary ---- radiator exchange
   PUMP-B phase 0 ----+

If one pump drifts out of phase, heat may rise while power output still looks
acceptable. Trust heat trend over relay state.
`,
    "fault_procedures.txt": `REACTOR FAULT PROCEDURES

Coolant pump phase mismatch:
  Inspect coolant.tsv.
  All active pump phase values should be 0.

Control rod response delay:
  Inspect config.ini.
  rod_response_ms must be 120 or lower.

Thermal threshold override:
  Inspect config.ini.
  thermal_alarm must be enabled.
  thermal_limit_c should be 80 or lower.

Relay bus dropout:
  Inspect relays.tsv.
  Relay state should be online.

Core sensor disagreement:
  Inspect diagnostics/latest.txt.
  Sensor spread above 40 counts indicates disagreement.

Emergency scram latch stuck:
  Inspect config.ini.
  scram_latch should be clear only after heat is safe.

Coolant contamination:
  Inspect coolant.tsv.
  Conductivity above 0.20 indicates contamination or sensor error.
`,
    "calibration_notes.txt": `REACTOR CALIBRATION NOTES

Core sensor values are arbitrary counts, not degrees.

Sensor A, B, and C are mounted at unequal depth. Absolute values may differ
slightly. Spread is more important than magnitude.

Thermal trend estimate:

  rising heat often means reactor allocation is high,
  coolant is contaminated,
  propulsion allocation is too low for radiator orientation,
  or thermal alarm has been disabled.

Relay diagnostics can be misleading if relays are online but routed to the
wrong bus.
`,
    "maintenance.log": `REACTOR MAINTENANCE LOG EXCERPTS

2298-02-14  Relay lattice cleaned after carbon scoring on standby bus.
2301-09-03  Rod bank B response normalized to 80 ms.
2306-11-22  Coolant loop A conductivity exceeded tolerance; flushed.
2310-01-19  Scram latch false-positive traced to thermal alarm override.
2314-06-02  Pump B phase monitor replaced. Crew note: monitor was not the fault.
`,
    "field_notes.txt": `ENGINEERING FIELD NOTES

The reactor tends to lie politely. It reports reserve and allocation, not fear.
If heat rises and power looks good, inspect coolant before changing output.

The old chief wrote on the relay cabinet:

  "The core is not angry. It is waiting for someone to read the whole panel."
`,
  },
  life_support: {
    "00_index.txt": `CSV SIMURGH SERVICE MANUAL
LIFE SUPPORT SYSTEM INDEX

Manual group: /archive/manuals/life_support
System path:  /ship/systems/life_support

Files:
  service_manual.txt
  components.txt
  diagrams.txt
  fault_procedures.txt
  calibration_notes.txt
  maintenance.log
  field_notes.txt
`,
    "service_manual.txt": `CSV SIMURGH LIFE SUPPORT SERVICE MANUAL
REVISION 51.03 / EMERGENCY COPY

1. PURPOSE

Life support regulates operator-compartment atmosphere through pressure
control, oxygen injection, CO2 scrubbing, humidity recovery, and trace
contaminant filtering.

Primary service artifacts:

  /ship/systems/life_support/config.ini
  /ship/systems/life_support/valves.tsv
  /ship/systems/life_support/scrubbers.tsv
  /ship/systems/life_support/atmosphere.tsv

2. NORMAL EMERGENCY TARGETS

  pressure             near 99.1 kPa
  target_o2_percent    20.8
  CO2                  below 1200 ppm
  humidity             35-50 percent
  pressure valves      regulated
  scrubber capacity    above 20 on active bank

3. SERVICE WARNING

Loop B labels were changed during refit. Live readings override deck labels.
If a valve path contradicts archived diagrams, inspect maintenance records
before assuming the diagram is authoritative.
`,
    "components.txt": `LIFE SUPPORT COMPONENT INVENTORY

PRESSURE VALVES
  VALVE-A and VALVE-B regulate loop pressure.
  position=open indicates an uncontrolled pressure path.

SCRUBBER BANKS
  BANK-A and BANK-B remove CO2.
  Active bank capacity below 20 is a service fault.

ATMOSPHERE SENSORS
  ATM-A, ATM-B, ATM-C measure pressure and oxygen fraction.
  Any pressure below 80 or above 110 kPa should be treated as impossible.

HUMIDITY CONDENSER
  Recovers water vapor and stabilizes humidity.

BIOFILTER BED
  Filters trace contaminants and biological aerosols.
`,
    "diagrams.txt": `LIFE SUPPORT LOOP LAYOUT

             +------------------+
             | O2 MIX CONTROL   |
             +--------+---------+
                      |
      +---------------+---------------+
      |                               |
  VALVE-A                         VALVE-B
  loop-a                          loop-b
      |                               |
      +---------------+---------------+
                      |
             +--------v---------+
             | OPERATOR VOLUME  |
             +--------+---------+
                      |
              CO2 scrubber bank
                      |
              humidity condenser
                      |
                 biofilter bed

Sensor voting:

  ATM-A ----+
  ATM-B ----+---- atmosphere consensus
  ATM-C ----+
`,
    "fault_procedures.txt": `LIFE SUPPORT FAULT PROCEDURES

Pressure valve stuck open:
  Inspect valves.tsv.
  Pressure valves should be position=regulated.

CO2 scrubber saturated:
  Inspect scrubbers.tsv.
  Active scrubber capacity should remain above 20.

Oxygen mix ratio corrupted:
  Inspect config.ini.
  target_o2_percent should be 20.8.

Humidity condenser offline:
  Inspect diagnostics/latest.txt.
  humidity_condenser should be online.

Bad atmosphere sensor:
  Inspect atmosphere.tsv.
  Pressure should be 80-110 kPa and O2 should be 18-23 percent.

Biofilter contamination:
  Inspect config.ini.
  biofilter_bed should not be contaminated or fouled.

Loop B mislabeled route:
  Inspect config.ini and valves.tsv.
  loop_b_label should be loop-b.
`,
    "calibration_notes.txt": `LIFE SUPPORT CALIBRATION NOTES

Atmosphere values do not move instantly after repair. Pressure and gas mix
recover over cycles. Validate the artifact first, then observe trend.

If CO2 rises while oxygen remains stable, suspect scrubber capacity.
If oxygen falls with pressure, suspect valve routing.
If humidity falls while temperature rises, suspect condenser routing or heat
load from reactor.
`,
    "maintenance.log": `LIFE SUPPORT MAINTENANCE LOG EXCERPTS

2287-04-05  Loop B relabeled after habitat section isolation.
2299-08-18  Scrubber BANK-A replaced. BANK-B retained as standby.
2304-12-11  ATM-C reported 140 kPa during vacuum test. Sensor recalibrated.
2311-03-30  Biofilter bed contaminated by garden vault spore event.
2315-10-02  Condenser routing table copied from pre-refit diagram; corrected.
`,
    "field_notes.txt": `CREW FIELD NOTES

If you are tired, read the pressure first. If you are afraid, read it again.

Loop B is where maps go to become lies. The valve does what the table says,
not what the old diagram remembers.
`,
  },
  sensors: {
    "00_index.txt": `CSV SIMURGH SERVICE MANUAL
SENSOR SYSTEM INDEX

Manual group: /archive/manuals/sensors
System path:  /ship/systems/sensors

Files:
  service_manual.txt
  components.txt
  diagrams.txt
  fault_procedures.txt
  calibration_notes.txt
  maintenance.log
  field_notes.txt
`,
    "service_manual.txt": `CSV SIMURGH SENSOR SERVICE MANUAL
REVISION 38.20 / EMERGENCY COPY

1. PURPOSE

Sensors resolve local sector topology, signal strength, archive correlations,
and anomaly traces. The operator sees scan output, signal, and map state. The
actual system is an array of hull lidar, mast receivers, timebase sources,
filters, and archive-correlation buses.

2. NORMAL EMERGENCY TARGETS

  angular_error      <= 1.0
  minimum_signal     <= 12
  archive_bus        online
  clock_skew_ms      <= 50
  rail_voltage       >= 11.2
  mast deployment    deployed

3. SERVICE WARNING

Do not lower filters to zero. The ship will begin hearing its own relays and
calling them stars.
`,
    "components.txt": `SENSOR COMPONENT INVENTORY

ARRAY-A
  Forward lidar and short-range rangefinding.

ARRAY-B
  Lateral lidar and sector boundary resolver.

MAST-C
  Long-baseline signal receiver mounted on forward mast.

ARCHIVE CORRELATION BUS
  Cross-checks scan results against historical route and fragment indexes.

TIMEBASE SOURCE
  Synchronizes returns. Drift causes false sector edges.

FILTER BANK
  Suppresses relay noise and thermal harmonics.
`,
    "diagrams.txt": `SENSOR DATA PATH

 ARRAY-A -----+
              |
 ARRAY-B -----+---- scan merger ---- filter bank ---- sector map
              |                           |
 MAST-C ------+                           +---- archive correlation bus
                                              |
                                        recovered fragments

TIMEBASE

  master clock ---> scan merger
  local clock  ---> fallback only

Mast shadowing occurs when MAST-C is stowed or when radiator panels block the
receiver during high-heat maneuvers.
`,
    "fault_procedures.txt": `SENSOR FAULT PROCEDURES

Lidar array misalignment:
  Inspect arrays.tsv.
  angular_error must be 1.0 or lower.

Signal filter too aggressive:
  Inspect filters.ini.
  minimum_signal should be 12 or lower.

Archive correlation bus disconnected:
  Inspect config.ini.
  archive_bus should be online.

Timebase drift:
  Inspect diagnostics/latest.txt.
  clock_skew_ms should be 50 or lower.

Antenna mast shadowing:
  Inspect arrays.tsv.
  MAST rows should be deployment=deployed.

Noise model corruption:
  Inspect filters.ini.
  noise_model should be simurgh-default.

Sensor power rail undervoltage:
  Inspect diagnostics/latest.txt.
  rail_voltage should be 11.2 or higher.
`,
    "calibration_notes.txt": `SENSOR CALIBRATION NOTES

Angular error is measured in internal scan units, not degrees. Values above
1.0 produce map disagreement during sector edge detection.

minimum_signal below 5 may increase false positives.
minimum_signal above 12 may hide weak transmissions.

rail_voltage below 11.2 can make every other correction appear ineffective.
Always check power rail before replacing filter models.
`,
    "maintenance.log": `SENSOR MAINTENANCE LOG EXCERPTS

2292-01-08  ARRAY-B struck by maintenance cradle. Alignment restored.
2296-07-17  MAST-C failed deployment in high-dust region.
2307-02-12  Archive correlation bus disconnected for privacy review.
2313-04-01  Timebase source drifted after reactor scram.
2315-12-29  Filter model restored from simurgh-default after ghost route event.
`,
    "field_notes.txt": `SENSOR FIELD NOTES

Weak signals matter. So do false ones.

The archive bus sometimes knows a place before the sensors admit it exists.
This is not proof of prophecy. It is proof that someone has been here before.
`,
  },
  archives: {
    "00_index.txt": `CSV SIMURGH SERVICE MANUAL
ARCHIVE SYSTEM INDEX

Manual group: /archive/manuals/archives
System path:  /ship/systems/archives

Files:
  service_manual.txt
  components.txt
  diagrams.txt
  fault_procedures.txt
  calibration_notes.txt
  maintenance.log
  field_notes.txt
`,
    "service_manual.txt": `CSV SIMURGH ARCHIVE SERVICE MANUAL
REVISION 63.88 / EMERGENCY COPY

1. PURPOSE

The archive system stores ship manuals, crew records, fragment indexes, and
mission memory. It is both a filesystem and a recovery instrument. Damage may
appear as missing files, duplicate manifest rows, wrong offsets, bad checksums,
or read-only vault state.

2. NORMAL EMERGENCY TARGETS

  vault_mode          emergency-write
  dust_gate           closed
  manual_catalog      /archive/manuals/lua
  cold_storage_bank   awake
  manifest_checksum   ok
  index offsets       unique

3. SERVICE WARNING

Do not trust a clean checksum if the manifest has duplicate fragment ids. A
checksum can confirm the wrong thing very precisely.
`,
    "components.txt": `ARCHIVE COMPONENT INVENTORY

INDEX MAP
  Maps fragment ids to storage offsets.

MANIFEST
  Records known archive fragments and active state.

CHECKSUM RECORD
  Marks whether manifest validation has passed.

VAULT MODE CONTROL
  Allows emergency-write during recovery operations.

COLD STORAGE BANK
  Holds dormant archive pages and crew records.

DUST GATE
  Protects archive spine from particulate contamination.
`,
    "diagrams.txt": `ARCHIVE RECOVERY PATH

 sensor scan
     |
     v
 archive correlation bus
     |
     v
 +----------------+
 | index.map      |
 +--------+-------+
          |
          v
 +----------------+
 | manifest.tsv   |
 +--------+-------+
          |
          v
 +----------------+
 | cold storage   |
 +----------------+

Manual catalog path:

  /archive/manuals/lua
  /archive/manuals/reactor
  /archive/manuals/life_support
  /archive/manuals/sensors
  /archive/manuals/archives
  /archive/manuals/propulsion
`,
    "fault_procedures.txt": `ARCHIVE FAULT PROCEDURES

Index map corruption:
  Inspect index.map.
  Each fragment id should map to a unique offset.

Manifest checksum mismatch:
  Inspect checksum.txt.
  manifest_checksum should be ok.

Read-only vault flag stuck:
  Inspect config.ini.
  vault_mode should be emergency-write.

Duplicate crew index entries:
  Inspect manifest.tsv.
  Fragment ids should not repeat.

Dust intrusion:
  Inspect config.ini.
  dust_gate should be closed.

Manual catalog path broken:
  Inspect config.ini.
  manual_catalog should be /archive/manuals/lua.

Cold storage wake failure:
  Inspect config.ini.
  cold_storage_bank should be awake.
`,
    "calibration_notes.txt": `ARCHIVE CALIBRATION NOTES

Archive integrity is not a single number. It is a relationship between offset
uniqueness, manifest consistency, cold storage wake state, and write mode.

If fragments repeat, inspect manifest first.
If fragments vanish, inspect index map first.
If manuals vanish, inspect manual_catalog before blaming filesystem damage.
`,
    "maintenance.log": `ARCHIVE MAINTENANCE LOG EXCERPTS

2279-10-20  Cold storage bank awakened after 41-year dormancy.
2284-05-09  Dust gate failed open during garden vault service.
2290-11-14  Crew manifest duplicated final command entry.
2308-06-23  Manual catalog path restored after language pack migration.
2316-04-19  Emergency console requested archive recovery context.
`,
    "field_notes.txt": `ARCHIVE FIELD NOTES

The archive never forgets cleanly. It folds.

One officer wrote:

  "If a record appears twice, ask what was too important to risk losing once."
`,
  },
  propulsion: {
    "00_index.txt": `CSV SIMURGH SERVICE MANUAL
PROPULSION SYSTEM INDEX

Manual group: /archive/manuals/propulsion
System path:  /ship/systems/propulsion

Files:
  service_manual.txt
  components.txt
  diagrams.txt
  fault_procedures.txt
  calibration_notes.txt
  maintenance.log
  field_notes.txt
`,
    "service_manual.txt": `CSV SIMURGH PROPULSION SERVICE MANUAL
REVISION 40.31 / EMERGENCY COPY

1. PURPOSE

Propulsion executes sector transfers, maintains maneuvering reserve, and
supports radiator orientation. It is not only the jump system. Low propulsion
allocation may reduce reactor heat rejection even when no jump is active.

2. NORMAL EMERGENCY TARGETS

  thruster aperture spread   <= 5
  fuel sensor offset         -2 to 2
  pressure_loss              0
  radiator_gimbal            clear
  burn_planner_checksum      ok
  truss vibration            <= 1.0

3. SERVICE WARNING

A route table can be stale while the map is correct. Navigation and propulsion
share information; they do not share authority.
`,
    "components.txt": `PROPULSION COMPONENT INVENTORY

THR-A / THR-B
  Paired maneuvering thrusters.
  Aperture mismatch wastes fuel and stresses the truss.

FUEL MAIN / RESERVE
  Stores maneuvering reserve.
  pressure_loss above 0 indicates leak or sensor fault.

BURN PLANNER
  Converts sector route into thrust timing.

RADIATOR GIMBAL
  Supports heat rejection by orienting radiator planes.

ROUTE TABLE
  Lists currently accepted sector transitions.
`,
    "diagrams.txt": `PROPULSION FLOW

        route request
             |
             v
      +--------------+
      | burn planner |
      +------+-------+
             |
     +-------+-------+
     |               |
  THR-A           THR-B
     |               |
     +-------+-------+
             |
        drive truss

FUEL

  main tank ----+
               +---- active feed ---- thrusters
  reserve  ----+

RADIATOR SUPPORT

  propulsion allocation >= 8 helps radiator orientation.
`,
    "fault_procedures.txt": `PROPULSION FAULT PROCEDURES

Thruster valve imbalance:
  Inspect thrusters.tsv.
  Aperture spread should be 5 or less.

Fuel reserve sensor offset:
  Inspect fuel.tsv.
  sensor_offset should be between -2 and 2.

Route table stale:
  Inspect routes.tsv.
  Known open links should be present.

Radiator orientation lock:
  Inspect config.ini.
  radiator_gimbal should be clear.

Maneuvering reserve leak:
  Inspect fuel.tsv.
  pressure_loss should be 0.

Burn planner checksum error:
  Inspect diagnostics/latest.txt.
  burn_planner_checksum should be ok.

Drive truss vibration:
  Inspect thrusters.tsv.
  vibration should be 1.0 or lower.
`,
    "calibration_notes.txt": `PROPULSION CALIBRATION NOTES

Thruster aperture is a relative timing value, not a percentage of maximum
thrust. Matching values matter more than high values during emergency routing.

If jump cost rises, inspect aperture spread.
If fuel changes without jumps, inspect pressure_loss.
If heat rises after lowering propulsion allocation, inspect radiator gimbal.
`,
    "maintenance.log": `PROPULSION MAINTENANCE LOG EXCERPTS

2288-12-02  THR-B aperture servo replaced after reserve leak event.
2297-07-21  Burn planner checksum updated for sector graph revision.
2302-03-18  Radiator gimbal lock cleared by manual truss crawl.
2312-09-09  Route table restored from map after sensor blackout.
2315-05-26  Drive truss vibration exceeded tolerance during short burn.
`,
    "field_notes.txt": `PROPULSION FIELD NOTES

The ship does not move like a body. It negotiates with accumulated velocity.

Never ask "can we jump?" only once. Ask navigation, propulsion, fuel, heat,
and hull. Then ask what each of them thinks the word "can" means.
`,
  },
};

export function createSystemManualTree() {
  return {
    type: "directory",
    children: Object.fromEntries(
      Object.entries(SYSTEM_MANUALS).map(([system, files]) => [
        system,
        {
          type: "directory",
          children: Object.fromEntries(
            Object.entries(files).map(([name, content]) => [name, { type: "file", content }]),
          ),
        },
      ]),
    ),
  };
}
