Prefer PlatformIO upload. For classic ESP32 / 4MB only:
python -m esptool --chip esp32 --port YOUR_PORT write_flash 0x1000 bootloader.bin 0x8000 partitions.bin 0xe000 boot_app0.bin 0x10000 firmware.bin
Public binaries are Wi-Fi unconfigured. Copy firmware/include/credentials.example.h to credentials.h, set your credentials and token, then build locally. Never publish configured binaries. Never flash only firmware.bin at address zero. See docs/assembly.md for wiring and first startup.
