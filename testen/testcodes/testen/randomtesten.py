from klassen.Servos import Lock, Flag
import time

slotje = Lock(12)

DELAY = 0.2
slotje.open_lock()
time.sleep(1)
slotje.close_lock()
time.sleep(1)

try:
    while True:
        slotje.close_lock()
        time.sleep(DELAY)
        slotje.open_lock()
        time.sleep(DELAY)

finally:
    slotje.cleanup()
