export const guides = [
  {
    title: "01 / Connect your device",
    tag: "NETWORK",
    steps: [
      "Copy credentials.example.h to the ignored firmware/include/credentials.h. Set your 2.4 GHz Wi-Fi credentials and a strong API token. Build locally; private binaries contain these secrets.",
      "Upload firmware and the LittleFS control filesystem. Read the DHCP address at 115200 baud or in your router; reserve that address. Wi-Fi retries every 10 seconds indefinitely.",
      "Open http://DEVICE_IP/control/ on your trusted LAN. Enter the API token here; it lives only in this tab’s memory. The GitHub Pages version is a simulation.",
      "For desktop development, run the local bridge with CAMX_DEVICE_URL pointing to the device. HTTPS Pages cannot safely call a plain HTTP LAN address, and the firmware deliberately has no CORS.",
    ],
  },
  {
    title: "02 / Wire and support the mount",
    tag: "POWER",
    steps: [
      "Use the regulated 5 V / 3 A supply. Branch 5 V to each servo and the ESP32 5 V input; share ground with all components. Servo signals are GPIO18 (pan) and GPIO19 (tilt).",
      "Place the 1000 µF capacitor across the servo supply near its branches. Observe polarity and use a voltage rating above 5 V. The photographed USB-C breakout needs its measured dimensions and correctly rated power wiring.",
      "When attaching a PC USB cable and external 5 V, prevent backfeeding: check your exact DevKit schematic, use a verified data-only USB power arrangement, or disconnect the external ESP32 5 V branch. Never assume all boards isolate supplies.",
      "Secure the base to a desk or tripod, add a camera tether, balance its center of gravity near the tilt axis, and keep cable slack through the full intended motion. Support the camera before disabling PWM.",
    ],
  },
  {
    title: "03 / Calibrate with horns removed",
    tag: "CALIBRATION",
    steps: [
      "Disconnect power and remove servo horns. Start unloaded. Connect power with PWM disabled; review current saved settings before arming. New defaults use narrow 1400 / 1500 / 1600 µs endpoints.",
      "While disarmed, save narrow endpoint and angle settings. Arm explicitly to center each servo. Mark its centered shaft position; disconnect power before fitting the horns with the mount level and facing forward.",
      "Reconnect and test one small axis offset at a time. Positive pan and tilt should follow your chosen convention. Disable PWM before changing the reverse-direction checkbox.",
      "Measure actual angle with a protractor. Expand pulse endpoints in small 10–20 µs increments, disarming before every save. Degree labels are normalized commanded estimates, not measured shaft positions. Never widen degree labels without measuring pulse-to-angle motion.",
      "Verify no collisions, bearing binding, cable pull, or servo end-stop buzzing. CAD limits are ±60° pan / ±25° tilt, but your physical safe limits may be smaller. Save your measured calibration and export a backup.",
    ],
  },
  {
    title: "04 / Take control deliberately",
    tag: "MOVEMENT",
    steps: [
      "ARM enables PWM and may jump to center on first enable; SG90 servos have no position feedback. Keep the camera supported. Never ARM while hardware STOP is pressed.",
      "The XY pad, sliders, nudges, and presets send both absolute offsets in a single JSON request. The newest unsent target replaces older queued targets; requests do not accumulate angles.",
      "Five seconds without an accepted command or explicit heartbeat latches STOP. The optional Maintain control switch renews that lease only while this tab is active; status reads do not.",
      "STOP cancels queued moves and holds position. Disable PWM releases holding torque. Network loss cancels motion; reconnecting never arms or replays targets. Return to the device and ARM explicitly after inspecting it.",
    ],
  },
  {
    title: "05 / Validate before mounting a camera",
    tag: "BENCH TEST",
    steps: [
      "First test an unloaded mechanism, then a secured dummy matching camera mass and center of gravity. Use a tether and keep fingers clear of moving parts.",
      "Run slow cycles and 15-minute dwell tests at the intended poses. Check arm flex, printed layer cracks, bearing fit, servo temperature, jitter, and cable strain. SG90 stall torque is not a continuous load rating.",
      "Verify physical STOP, command timeout, Wi-Fi disconnect, router restart, authentication rejection, and re-ARM behavior on actual hardware. Browser simulation cannot validate these.",
      "Use PETG with sufficient walls and appropriate layer orientation. Reprint damaged parts; tighten joints without crushing plastic. Heavier or frequently moving cameras may require stronger servos and independent shaft bearings.",
    ],
  },
];
