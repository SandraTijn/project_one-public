import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)
import time
import spidev

from models.SimpleMFRC522 import SimpleMFRC522
from models.Oled import Oled
from models.hx711py.hx711 import HX711
from models.Servos import Lock, Flag

# hardware constants
REED_PIN = 26
BUTTON_PIN = 16

# other constants
WEIGHT_DELAY = 10
LOCK_DELAY = 10
OLED_DELAY = 5


# things to delete (database)
USER1 = 907115164757
temp_user_ids = {907115164757: "user1"}
temp_triggerwaarde_weightsensor = 300.00
temp_reed_historiek = []
temp_triggerwaarde_ldr = 30


# objects
rfid_reader = SimpleMFRC522()
oled_scherm = Oled(oled_addr=0x3c)

hx = HX711(dout=17, pd_sck=27)

servo_lock = Lock(13)
servo_flag = Flag(12, 100)




# global variables
oled_off_time = time.time() + OLED_DELAY
is_oled_input_changed = True
oled_tekst = ""

weight_weighttime = time.time() + WEIGHT_DELAY

lock_state = True   #True = Open, False = Closed
lock_close_time = time.time()

flag_state = True   #True = Up, False = Down
vorige_flag_state = True


# functions
def check_rfid():
    global oled_off_time, is_oled_input_changed, lock_state, lock_close_time, oled_tekst
    id = rfid_reader.read_id_no_block()
    if id is not None:
        if id in temp_user_ids.keys():
            print(f"Welkom user: {temp_user_ids[id]}")
            lock_state = True
            lock_close_time = time.time() + LOCK_DELAY
            servo_lock.open_lock()
            print("open lock")
            oled_off_time = time.time() + OLED_DELAY
            is_oled_input_changed = True
            oled_tekst = f"User: {temp_user_ids[id]}"
        else:
            print(f"User not recognised: {id}")
            oled_off_time = time.time() + OLED_DELAY
            oled_scherm.draw_text(0, 0, "verkeerde RFID-ID     ")

def check_oled():
    global oled_off_time, is_oled_input_changed, oled_tekst

    if time.time() < oled_off_time:
        if is_oled_input_changed == True:
            is_oled_input_changed = False
            oled_scherm.show_lan_ip()
            if oled_tekst:
                oled_scherm.draw_text(0, 3,oled_tekst)
            
            
    else:
        # print("oled off")
        is_oled_input_changed = False
        oled_tekst = ""
        oled_scherm.clear_screen()

def check_weight() -> float:
    global weight_weighttime, temp_triggerwaarde_weightsensor, flag_state
    if time.time() > weight_weighttime:
        weight_weighttime = time.time() + WEIGHT_DELAY
        while True:
            waarden = [hx.get_weight(5) for _ in range(5)]
            gewicht = sum(waarden) / len(waarden)
            gewicht = gewicht * -1
            # print(f"Gewicht: {gewicht:.2f}")

            if gewicht >= temp_triggerwaarde_weightsensor:
                print("flag up")
                servo_flag.flag_up()
            else:
                print("flag down")
                servo_flag.flag_down()
            return gewicht

def read_ldr():
    lijst = [1, ((0<<4) | 0b10000000) , 0]
    adc = spi.xfer(lijst)
    # adc[0] wegsmijten
    data = ((adc[1]&0b00000011)<<8) | adc[2]
    data = (data/1023) *100
    return data

def check_lock():
    global lock_state, lock_close_time
    if lock_state:
        if read_ldr() > temp_triggerwaarde_ldr and time.time() >= lock_close_time:
            lock_state = False
            servo_lock.close_lock()
            print("close lock")

   




# callback functions
def callback_reed(pin):
    global temp_reed_historiek
    if GPIO.input(REED_PIN):
        print("reed-switch")
        temp_reed_historiek.append(time.time())

def callback_button(pin):
    print("button pressed: foute waarde. Flag down and tare of gewichtsensor")
    servo_flag.flag_down()
    print("Tare uitvoeren...")
    hx.tare()
    print("Tare klaar.")
    


try:
    print("setup")
    oled_scherm.setup()

    hx.set_reference_unit(123)
    print("Tare uitvoeren...")
    hx.tare()
    print("Tare klaar.")

    servo_lock.open_lock()
    time.sleep(1)
    servo_lock.close_lock()
    lock_state = False

    servo_flag.flag_up()
    time.sleep(1)
    servo_flag.flag_down()

    GPIO.setup(REED_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.add_event_detect(REED_PIN, GPIO.RISING, callback_reed, 200)

    GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.add_event_detect(BUTTON_PIN, GPIO.FALLING, callback_button, 200)

    spi = spidev.SpiDev()
    spi.open(0, 1)
    spi.max_speed_hz = 10 ** 5


    
    print("loop")
    while True:
        check_rfid()
        check_oled()

        weight = check_weight()
        if weight:
            print(weight)
        
        # print(f"{read_ldr():.2f}%")
        # print(spi.readbytes())

        check_lock()
        time.sleep(0.1)
        # print(f"{time.time()} <> {oled_off_time}")


finally:
    GPIO.cleanup()
    print("cleanup")























