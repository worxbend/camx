"""Compile and verify the actual offline ESP32 S-curve planner on the host."""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
library=ROOT/'firmware/lib/ruckig'
binary=Path('/tmp/camx-motion-test')
# Upstream solver overloads intentionally leave several constraint arguments unused.
subprocess.run(['g++','-std=c++17','-O1','-Wall','-Wextra','-Werror','-Wno-unused-parameter',
 '-fsanitize=address,undefined','-fno-omit-frame-pointer',
 '-I'+str(ROOT/'firmware/include'),'-I'+str(library/'include'),
 str(ROOT/'tests/motion_test.cpp'),*[str(p) for p in sorted((library/'src').glob('*.cpp'))],
 '-o',str(binary)],check=True)
subprocess.run([str(binary),*sys.argv[1:]],check=True)
