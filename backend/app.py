
# --------------------
# MailBuddy
# Project One project (MCT at Howest) door Tijn Sandra
# --------------------


import asyncio
import socketio
import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from repositories.DataRepository import DataRepository
import datetime

from models.models import Device, Triggerwaarde, User, Historiek, DTOSensorWaarde, LastUser, IsPost, LaatsteLevering, DelayTime, DTODelaytime, DTOTriggerwaarde, DTOPassword, DTOAction


from RPi import GPIO
import time
import threading
import logging
import spidev
import os

from models.SimpleMFRC522 import SimpleMFRC522
from models.Oled import Oled
from models.hx711py.hx711 import HX711
from models.Servos import Lock, Flag

GPIO.setmode(GPIO.BCM)

logging.basicConfig(
    level=logging.INFO,                    # alles ≥ INFO‑niveau tonen
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",         # Europees datum‑formaat
    force=True,                           # herconfigureer bij auto‑reload
)
logger = logging.getLogger(__name__)

# hardware constants
REED_PIN = 26
BUTTON_PIN = 16
LED_PIN = 20
SHUTDOWN_BUTTON = 23

#other constants
SHUTDOWN_PASSWORD = "mijnPasswo0rd"


# user_ids hier zijn temp, worden gelezen door database
user_ids = {907115164757: "user1"}
triggerwaarde_weightsensor = 300.00
triggerwaarde_ldr = 70

# delaytimes (get changed with database)
weight_delay = 10
lock_delay = 10
oled_delay = 5
ldr_delay = 4


# ----------------------------------------------------
# App setup
# ----------------------------------------------------

@asynccontextmanager
# Lifespan Manager (Startup/Shutdown)
async def lifespan_manager(app: FastAPI):
    # Start background taken (process_queue + all_out) op in de applicatie
    global async_loop
    async_loop = asyncio.get_running_loop()



    GPIO.setup(REED_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(SHUTDOWN_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
     

    threading.Thread(
        target=gpio_keep_alive,
        daemon=True               # 🔑 daemon‑threads stoppen automatisch bij app‑exit
    ).start()

    # async_loop.create_task(tweede_thread()) # loop.create_task for asyncio world / async tasks
    # Geef controle aan FastAPI/Socket.IO
    yield

    # GPIO cleanup and goodbye
    GPIO.cleanup()
    logger.info("GPIO cleaned up - bye!")


# Create a FastAPI app, add CORS middleware, initialize Socket.IO server + ASGI app, create async queue for messages
app = FastAPI(lifespan=lifespan_manager)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
sio = socketio.AsyncServer(cors_allowed_origins='*', async_mode='asgi', logger=True)
sio_app = socketio.ASGIApp(sio, app)

ENDPOINT = "/api/v1"  # Define the endpoint for the API

# global variables and global objects
oled_off_time = time.time() + oled_delay
is_oled_input_changed = True
oled_tekst = ""

weight_weighttime = time.time() + weight_delay

lock_state = True   #True = Open, False = Closed
lock_close_time = time.time()

shutdown_button_time = time.time() + 10

ldr_value = 0
ldr_time = time.time() 

servo_lock = Lock(13)
servo_flag = Flag(12, 100)
hx = HX711(dout=17, pd_sck=27)
rfid_reader = SimpleMFRC522()



# ----------------------------------------------------
# Background Tasks
# ----------------------------------------------------

# Add GPIO keep alive thread
def gpio_keep_alive():
    global async_loop, lock_state
    

# objects
    GPIO.setup(LED_PIN, GPIO.OUT)

    oled_scherm = Oled(oled_addr=0x3c)

    print("setup")
    oled_scherm.setup()

    hx.set_reference_unit(516.82)
    # hx.set_reference_unit(495.0)
    print("Tare uitvoeren...")
    hx.tare()
    print("Tare klaar.")

    servo_lock.open_lock()
    time.sleep(1)
    servo_lock.close_lock()
    lock_state = False

    GPIO.output(LED_PIN, GPIO.HIGH)
    servo_flag.flag_up()
    time.sleep(1)
    GPIO.output(LED_PIN, GPIO.LOW)
    servo_flag.flag_down()

    
    spi = spidev.SpiDev()
    spi.open(0, 1)
    spi.max_speed_hz = 10 ** 5

    logger.info("GPIO initialised")


    # functions
    def check_rfid():
        global oled_off_time, is_oled_input_changed, lock_state, lock_close_time, oled_tekst, user_ids
        time.sleep(0.1)
        id = rfid_reader.read_id_no_block()
        # id, text = rfid_reader.read_no_block()
        # time.sleep(0.1)
        # print(id)
        print(f">>>>> {id}")
        if id is not None:
            if id in user_ids.keys():
                print(f"Welkom user: {user_ids[id][1]}")
                userID = user_ids[id][0]
                username = user_ids[id][1]
                open_lock(userID, username)
                
            else:
                print(f"User not recognised: {id}")
                oled_off_time = time.time() + oled_delay
                oled_scherm.draw_text(0, 0, "verkeerde RFID-ID     ")

    def open_lock(userID, username):
        global lock_state, lock_close_time, oled_off_time, is_oled_input_changed, oled_tekst
        lock_state = True
        lock_close_time = time.time() + lock_delay
        servo_lock.open_lock()
        print("open lock")
        oled_off_time = time.time() + oled_delay
        is_oled_input_changed = True
        oled_tekst = f"User: {username}"

        # print(f"\t\nUserIDs: {user_ids}\n")
        
        DataRepository.add_userunlock_database(userID, f"user {username} presented RFID-tag")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(3),
                async_loop
            )
        DataRepository.add_actuatoraction_database(1, 1, True, "open lock")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(1),
                async_loop
            )
        future = asyncio.run_coroutine_threadsafe(
            B2F_lock_change(),
            async_loop
        )


    def check_oled():
        global oled_off_time, is_oled_input_changed, oled_tekst

        if time.time() < oled_off_time:
            if is_oled_input_changed == True:
                is_oled_input_changed = False
                oled_scherm.show_lan_ip()
                if oled_tekst:
                    oled_scherm.draw_text(0, 3,oled_tekst)
                
                
        else:
            is_oled_input_changed = False
            oled_tekst = ""
            oled_scherm.clear_screen()

    def check_weight() -> float:
        global weight_weighttime, triggerwaarde_weightsensor
        if time.time() > weight_weighttime:
            weight_weighttime = time.time() + weight_delay
            waarden = [hx.get_weight(5) for _ in range(10)]
            gewicht = sum(waarden) / len(waarden)
            gewicht = gewicht
            # print(f"Gewicht: {gewicht:.2f}")
            gewicht = round(gewicht, 2)

            DataRepository.add_sensorwaarde_database(4, gewicht, "Gewicht gemeten")
            future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(4),
                async_loop
            )
            
            if gewicht >= triggerwaarde_weightsensor:
                print("flag up")
                servo_flag.flag_up()
                DataRepository.add_actuatoraction_database(2, 3, True, "Flag up")
                future = asyncio.run_coroutine_threadsafe(
                    B2F_new_sensorwaarde(2),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_post_change(True),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_actuator_change(2, True),
                    async_loop
                )
                # led aan
                GPIO.output(LED_PIN, GPIO.HIGH)
                DataRepository.add_actuatoraction_database(7, 5, True, "Led on")
                future = asyncio.run_coroutine_threadsafe(
                    B2F_new_sensorwaarde(7),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_actuator_change(7, True),
                    async_loop
                )

            else:
                print("flag down")
                servo_flag.flag_down()
                DataRepository.add_actuatoraction_database(2, 4, False, "Flag down")
                future = asyncio.run_coroutine_threadsafe(
                    B2F_new_sensorwaarde(2),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_post_change(False),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_actuator_change(2, False),
                    async_loop
                )
                # led uit
                GPIO.output(LED_PIN, GPIO.LOW)
                DataRepository.add_actuatoraction_database(7, 6, False, "Led off")
                future = asyncio.run_coroutine_threadsafe(
                    B2F_new_sensorwaarde(7),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_actuator_change(7, False),
                    async_loop
                )
            return gewicht

    def read_ldr():
        global ldr_time, ldr_delay
        if time.time() > ldr_time:
            ldr_time += ldr_delay
            lijst = [1, ((0<<4) | 0b10000000) , 0]
            adc = spi.xfer(lijst)
            # adc[0] wegsmijten
            data = ((adc[1]&0b00000011)<<8) | adc[2]
            print("ADC ruwe waarde:", data)
            data = (data/1023) *100
            # data = 100 - data (bij omgekeerd geschakeld)
            data = float(round(data, 2))

            DataRepository.add_sensorwaarde_database(6, data, "LDR waarde")
            
            future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(6),
                async_loop
            )
            
            
            return data



    def check_lock(ldr_waarde):
        global lock_state, lock_close_time, triggerwaarde_ldr
        if lock_state:
            if ldr_waarde < triggerwaarde_ldr and time.time() >= lock_close_time:
                lock_state = False
                servo_lock.close_lock()
                print("close lock")
                DataRepository.add_actuatoraction_database(1, 2, False, "close lock")
                future = asyncio.run_coroutine_threadsafe(
                    B2F_new_sensorwaarde(1),
                    async_loop
                )
                future = asyncio.run_coroutine_threadsafe(
                    B2F_lock_change(),
                    async_loop
                )
    
    def check_shutdown_button():
        global shutdown_button_time
        if (GPIO.input(SHUTDOWN_BUTTON) == True):
            shutdown_button_time = time.time() + 10
        else:
            if (shutdown_button_time < time.time()):
                print("shutdown button pressed")
                DataRepository.add_actuatoraction_database(10, True, "Shutdown")
                os.system("sudo poweroff")
            else:
                print("blijf indrukken voor shutdown")
                print(f"{shutdown_button_time} <> {time.time()}")





    def setup_variables():
        global user_ids, triggerwaarde_weightsensor, triggerwaarde_ldr, lock_state, ldr_delay, lock_delay, oled_delay, weight_delay
        user_ids = {}
        temp_users = DataRepository.get_users()

        if not temp_users:
            raise ValueError("Geen user_ids")
        
        for user in temp_users:
            user_ids[user["rfidID"]] = [user["userID"], user["name"]]
        print(user_ids)


        triggerwaarden = DataRepository.get_triggerwaarden_sensoren()
        if not triggerwaarden:
            raise ValueError("Geen triggerwaarden")
        for waarde in triggerwaarden:
            deviceID = waarde["deviceID"]
            triggerwaarde = waarde["triggerwaarde"]
            if deviceID == 4:
                triggerwaarde_weightsensor = triggerwaarde
            if deviceID == 6:
                triggerwaarde_ldr = triggerwaarde


        delaytimes = DataRepository.get_all_delaytimes()
        if not delaytimes:
            raise ValueError("Geen delaytimes")
        for waarde in delaytimes:
            deviceID = waarde["DeviceID"]
            delaytime = waarde["delaytime"]
            if deviceID == 1:
                # lock
                lock_delay = delaytime
            if deviceID == 4:
                # weight
                weight_delay = delaytime
            if deviceID == 6:
                # ldr
                ldr_delay = delaytime
            if deviceID == 9:
                # oled
                oled_delay = delaytime

            
        
        DataRepository.add_actuatoraction_database(1, 2, False, "Opstarten: sluiten lock")
        future = asyncio.run_coroutine_threadsafe(
            B2F_lock_change(),
            async_loop
        )
        lock_state = False
        DataRepository.add_actuatoraction_database(2, 4, False, "Opstarten: flag down")
                

    # callback functions
    def callback_reed(pin):
        if GPIO.input(REED_PIN):
            print("reed-switch")
            DataRepository.add_sensorwaarde_database(5, True, "Klep open")
            future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(5),
                async_loop
            )
        else:
            DataRepository.add_sensorwaarde_database(5, False, "Klep dicht")
            future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(5),
                async_loop
            )

    def callback_button(pin):
        print("button pressed: foute waarde. Flag down and tare of gewichtsensor")
        DataRepository.add_actuatoraction_database(2, 4, False, "Foute waarde")
        servo_flag.flag_down()
        future = asyncio.run_coroutine_threadsafe(
            B2F_new_sensorwaarde(2),
            async_loop
        )
        future = asyncio.run_coroutine_threadsafe(
            B2F_post_change(False),
            async_loop
        )
        print("Tare uitvoeren...")
        hx.tare()
        print("Tare klaar.")


    # event detects
    GPIO.add_event_detect(BUTTON_PIN, GPIO.FALLING, callback_button, 200)
    GPIO.add_event_detect(REED_PIN, GPIO.RISING, callback_reed, 200)

    # main code
    logger.info("gpio_keep_alive gestart; wacht op button events…")
    setup_variables()
    print("loop")
    logger.info("loop")
    while True:
        global ldr_value
        check_rfid()
        check_oled()

        weight = check_weight()
        if weight:
            print(weight)

        time.sleep(0.2)
        temp_ldr_value = read_ldr()
        if temp_ldr_value is not None:
            ldr_value = temp_ldr_value

        check_lock(ldr_value)
        check_shutdown_button()
        
        time.sleep(0.2)


# ----------------------------------------------------
# FastAPI Endpoints
# ----------------------------------------------------


@app.get("/", tags=["Test"])
async def root():
    return "Server werkt, maar hier geen API endpoint gevonden."

@app.get(ENDPOINT + "/devices/", response_model=list[Device], summary="Get all devices", tags=["Devices"])
async def get_all_sensors():
    data = DataRepository.get_all_devices()
    if not data:
        raise HTTPException(status_code=404, detail="Geen devices gevonden")
    return data

@app.get(ENDPOINT + "/sensors/", response_model=list[Device], summary="Get all sensors", tags=["Devices"])
async def get_all_sensors():
    data = DataRepository.get_all_sensors()
    if not data:
        raise HTTPException(status_code=404, detail="Geen sensors gevonden")
    return data

@app.get(ENDPOINT + "/actuator/", response_model=list[Device], summary="Get all actuators", tags=["Devices"])
async def get_all_sensors():
    data = DataRepository.get_all_actuators()
    if not data:
        raise HTTPException(status_code=404, detail="Geen actuators gevonden")
    return 

@app.get(ENDPOINT + "/device/{id}/", response_model=Device, summary="Get one device by id", tags=["Devices"])
async def get_one_device(id):
    data = DataRepository.get_one_device(id)
    if not data:
        raise HTTPException(status_code=404, detail="Device niet gevonden")
    return data

@app.get(ENDPOINT + "/triggerwaarden/", response_model=list[Triggerwaarde], summary="Get triggerwaarden sensoren", tags=["Devices"])
async def get_triggerwaarden():
    data = DataRepository.get_triggerwaarden_sensoren()
    if not data:
        raise HTTPException(status_code=404, detail="Device niet gevonden")
    return data

@app.get(ENDPOINT + "/triggerwaarde/{deviceID}", response_model=Triggerwaarde, summary="Get triggerwaarden sensor", tags=["Devices"])
async def get_one_triggerwaarde(deviceID):
    data = DataRepository.get_one_triggerwaarde_sensor(deviceID)
    if not data:
        raise HTTPException(status_code=404, detail="Device niet gevonden")
    return data

@app.patch(ENDPOINT + '/triggerwaarde/', summary="wijzig een triggerwaarde", response_model=DTOTriggerwaarde, tags=["Devices"])
async def wijzig_triggerwaarde(body: DTOTriggerwaarde):
    global triggerwaarde_ldr, triggerwaarde_weightsensor
    data = DataRepository.get_one_triggerwaarde_sensor(body.deviceID)
    if not data:
            raise HTTPException(status_code=404, detail="Sensor niet gevonden")
    data = DataRepository.wijzig_one_triggerwaarde(body.deviceID, body.triggerwaarde)
    if not data:
            raise HTTPException(status_code=404, detail="Triggerwaarde niet upgedate")
    data = DataRepository.get_one_triggerwaarde_sensor(body.deviceID)
    if not data:
            raise HTTPException(status_code=404, detail="Device niet gevonden")
    # print(f"\n\t-----{data}-----\n")
    
    if body.deviceID == 4:
        triggerwaarde_weightsensor = body.triggerwaarde
    if body.deviceID == 6:
        triggerwaarde_ldr = body.triggerwaarde

    output = {"msg": "new triggerwaarde", "deviceID": body.deviceID, "triggerwaarde": body.triggerwaarde}
    await sio.emit("B2F_triggerwaarde_change", output)
    print("socket ge-emit")

    return data




@app.get(ENDPOINT + "/users/", response_model=list[User], summary="Get users (name and rfidID)", tags=["Users"])
async def get_users():
    data = DataRepository.get_users()
    if not data:
        raise HTTPException(status_code=404, detail="Users niet gevonden")
    return data

@app.get(ENDPOINT + "/lastusers/{limit}/", response_model=list[LastUser], summary="Get last users (ID and rfidID)", tags=["Users"])
async def get_last_users(limit: int = 1):
    output = []
    data = DataRepository.get_last_users(limit)
    if not data:
        raise HTTPException(status_code=404, detail="Users niet gevonden")
    print(data)
    for user in data:
        userID = user["userID"]
        datum_en_tijd = user["datum_en_tijd"]

        name_data = DataRepository.get_one_user(userID)
        if not name_data:
            raise HTTPException(status_code=404, detail="Users niet gevonden")
        username = name_data["name"]

        output.append({"username": username, "datum_en_tijd": datum_en_tijd})

    return output

@app.get(ENDPOINT + "/user/{id}/", response_model=User, summary="Get one user", tags=["Users"])
async def get_one_user(id):
    data = DataRepository.get_one_user(id)
    if not data:
        raise HTTPException(status_code=404, detail="Users niet gevonden")
    return data


@app.get(ENDPOINT + "/historiek/", response_model=list[Historiek], summary="Get historiek", tags=["Historiek"])
async def get_historiek():
    data = DataRepository.get_historiek()
    if not data:
        raise HTTPException(status_code=404, detail="Historiek niet gevonden")
    return data

@app.get(ENDPOINT + "/historiek_limit/{limit}/", response_model=list[Historiek], summary="Get historiek met limit", tags=["Historiek"])
async def get_historiek_limit(limit):
    data = DataRepository.get_last_historiek_limit(limit)
    if not data:
        raise HTTPException(status_code=404, detail="Historiek niet gevonden")
    return data

@app.get(ENDPOINT + "/historiek_device_limit/{deviceID}/{limit}/", response_model=list[Historiek], summary="Get historiek van een device met limit", tags=["Historiek"])
async def get_historiek_device_limit(deviceID, limit):
    data = DataRepository.get_last_historiek_device_limit(deviceID, limit)
    if not data:
        raise HTTPException(status_code=404, detail="Historiek niet gevonden")
    return data


@app.post(ENDPOINT + '/sensor/', summary="add sensorwaarde", response_model=Historiek, tags=["Database"])
async def add_sensorwaarde(body: DTOSensorWaarde):
    data = DataRepository.add_sensorwaarde_database(body.DeviceID, body.waarde, body.comment)
    print(data)
    if not data:
        HTTPException(status_code=400, detail="Waarde niet toegevoegd")
    new_historiek = DataRepository.get_historiek_by_id(data)
    if not new_historiek:
        HTTPException(status_code=400, detail="Historiek niet gevonden, maar wel toegevoegd")
    
    output = {"msg": "Niewe sensorwaarde", "DeviceID": new_historiek["deviceID"], "datetime": str(new_historiek["datum_en_tijd"]), "waarde": new_historiek["waarde"]}
    print(output)

    await sio.emit("B2F_new_sensorwaarde", output)
    print("sio ge-emit")

    return new_historiek


@app.get(ENDPOINT + "/post/", response_model=IsPost, summary="Kijk of er post is", tags=["Database"])
async def get_post():
    weight_sensor_triggerwaarde = DataRepository.get_one_device(4)["triggerwaarde"]
    if not weight_sensor_triggerwaarde:
        raise HTTPException(status_code=404, detail="Triggerwaarde sensor niet gevonden")
    weight_sensor_waarde = DataRepository.get_last_historiek_device_limit(4, 1)[0]["waarde"]
    if not weight_sensor_waarde:
        raise HTTPException(status_code=404, detail="Sensorwaarde niet gevonden")
    
    print(f"\n\t{weight_sensor_waarde} > {weight_sensor_triggerwaarde}? \n")
    if weight_sensor_waarde > weight_sensor_triggerwaarde:
        return {"isPost": True}
    else:
        return {"isPost": False}

@app.get(ENDPOINT + "/levering/{limit}", response_model=list[LaatsteLevering], summary="geef tijd laatste levering post", tags=["Database"])
async def get_levering(limit: int = 1):
    data = DataRepository.get_last_levering(limit)
    if not data:
        raise HTTPException(status_code=404, detail="Laatste levering niet gevonden")
    output_list = []
    for date in data:
        output_list.append({"laatsteLevering": date["datum_en_tijd"]})
    return output_list



@app.post(ENDPOINT + '/toggle_lock/', summary="toggle lock_state", response_model=dict, tags=["Actions"])
async def api_toggle_open_lock():
    # open_lock(1, "Website")
    global lock_state, lock_close_time, oled_off_time, is_oled_input_changed, oled_tekst
    # lock_state = True
    if lock_state:
        lock_state = False
        servo_lock.close_lock()
        print("close lock")
        future = asyncio.run_coroutine_threadsafe(
            B2F_new_sensorwaarde(1),
            async_loop
        )
        return {"message": "done!"}
        
    else:
        lock_state = True
        lock_close_time = time.time() + lock_delay
        servo_lock.open_lock()
        print("open lock")
        oled_off_time = time.time() + oled_delay
        is_oled_input_changed = True
        oled_tekst = f"User: Website"
        DataRepository.add_userunlock_database(1, f"Open lock from website")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(3),
                async_loop
            )
        DataRepository.add_actuatoraction_database(1, 1, True, "open lock")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(1),
                async_loop
            )
        return {"message": "done!"}
    
@app.post(ENDPOINT + '/lock/{state}/', summary="Open or close lock", response_model=dict, tags=["Actions"])
async def api_lock_control(state):
    global lock_state, lock_close_time, oled_off_time, is_oled_input_changed, oled_tekst
    state = int(state)
    if state == 0:
        lock_state = False
        servo_lock.close_lock()
        print("close lock")
        DataRepository.add_actuatoraction_database(1, 2, False, "close lock from website")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(1),
                async_loop
            )
        return {"message": "done!"}
        
    elif state == 1:
        lock_state = True
        lock_close_time = time.time() + lock_delay
        servo_lock.open_lock()
        print("open lock")
        oled_off_time = time.time() + oled_delay
        is_oled_input_changed = True
        oled_tekst = f"User: Website"
        DataRepository.add_userunlock_database(1, f"Close lock from website")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(3),
                async_loop
            )
        DataRepository.add_actuatoraction_database(1, 1, True, "open lock by website")
        future = asyncio.run_coroutine_threadsafe(
                B2F_new_sensorwaarde(1),
                async_loop
            )
        return {"message": "done!"}
    else:
        return {"message" : "fout!"}


@app.get(ENDPOINT + "/delay/", response_model=list[DelayTime], summary="geef delaytimes voor devices (die hebben)", tags=["Database"])
async def get_delay_times():
    data = DataRepository.get_all_delaytimes()
    if not data:
        raise HTTPException(status_code=404, detail="Delaytimes niet gevonden")
    print(f"-----\n\t{data}\n-----")
    return data

@app.get(ENDPOINT + "/delay/{deviceID}", response_model=DelayTime, summary="geef delaytime voor device ", tags=["Devices"])
async def get_delay_time(deviceID):
    data = DataRepository.get_delaytime(deviceID)
    if not data:
        raise HTTPException(status_code=404, detail="Delaytime niet gevonden")
    return data


@app.patch(ENDPOINT + '/delay/', summary="wijzig een delaytime", response_model=DelayTime, tags=["Devices"])
async def wijzig_delaytime(body: DTODelaytime):
    global lock_delay, ldr_delay, oled_delay, weight_delay
    data = DataRepository.get_delaytime(body.deviceID)
    if not data:
            raise HTTPException(status_code=404, detail="Device niet gevonden")
    data = DataRepository.wijzig_delaytime(body.deviceID, body.delaytime)
    if not data:
            raise HTTPException(status_code=404, detail="Delaytime niet upgedate")
    data = DataRepository.get_delaytime(body.deviceID)
    if not data:
            raise HTTPException(status_code=404, detail="Device niet gevonden")
    
    if body.deviceID == 1:
        lock_delay = body.delaytime
    if body.deviceID == 4:
        weight_delay = body.delaytime
    if body.deviceID == 9:
        oled_delay = body.delaytime

    output = {"msg": "new delaytime", "deviceID": body.deviceID, "delaytime": body.delaytime}
    await sio.emit("B2F_delaytime_change", output)
    print("socket ge-emit")

    return data


@app.post(ENDPOINT + "/fault/", response_model=dict, summary="foute waarde ", tags=["Actions"])
async def fault():
    DataRepository.add_actuatoraction_database(2, 4, False, "Foute waarde")
    # servo flag
    servo_flag.flag_down()
    future = asyncio.run_coroutine_threadsafe(
        B2F_new_sensorwaarde(2),
        async_loop
    )
    future = asyncio.run_coroutine_threadsafe(
        B2F_post_change(False),
        async_loop
    )

    # led uit
    GPIO.output(LED_PIN, GPIO.LOW)
    DataRepository.add_actuatoraction_database(7, 6, False, "Led off (foute waarde)")
    future = asyncio.run_coroutine_threadsafe(
        B2F_new_sensorwaarde(7),
        async_loop
    )
    future = asyncio.run_coroutine_threadsafe(
        B2F_actuator_change(7, False),
        async_loop
    )
    
    print("Tare uitvoeren...")
    hx.tare()
    print("Tare klaar.")
    return {"msg": "fault geregistreerd"}

@app.post(ENDPOINT + "/shutdown/", response_model=dict, summary="Shutdown pi ", tags=["Actions"])
async def shutdown_pi(body: DTOPassword):
    global SHUTDOWN_PASSWORD
    if body.password == SHUTDOWN_PASSWORD:
        os.system("sudo poweroff")
        return {"msg": "system will power off now! Thanks for using."}
    else:
        return {"msg": "Fout paswoord!"}
    
@app.post(ENDPOINT + "/actuator/", response_model=dict, summary="actuator aan of uitzetten ", tags=["Actions"])
async def shutdown_pi(body: DTOAction):
    if body.deviceID == 2:
        if body.value:
            servo_flag.flag_up()
            DataRepository.add_actuatoraction_database(2, 3, True, "flag up via website")
        else:
            servo_flag.flag_down()
            DataRepository.add_actuatoraction_database(2, 4, False, "flag down via website")
        future = asyncio.run_coroutine_threadsafe(
            B2F_actuator_change(2, body.value),
            async_loop
        )
    
    if body.deviceID == 7:
        if body.value:
            GPIO.output(LED_PIN, GPIO.HIGH)
            DataRepository.add_actuatoraction_database(7, 5, body.value, "led on via website")
        else:
            GPIO.output(LED_PIN, GPIO.LOW)
            DataRepository.add_actuatoraction_database(7, 6, body.value, "led off via website")
        future = asyncio.run_coroutine_threadsafe(
            B2F_actuator_change(7, body.value),
            async_loop
        )
    return {"msg": "done"}



# ----------------------------------------------------
# Socket.IO Handlers
# ----------------------------------------------------


@sio.event
async def connect(sid, environ):
    print(f"[Socket.IO] Client geconnecteerd: {sid}")
    # lampenstatus = DataRepository.read_status_lampen()
    # await sio.emit('B2F_status_lampen', {'lampen': lampenstatus}, to=sid)


@sio.event
async def B2F_new_sensorwaarde(DeviceID):
    # print(f"\n\tB2F!!!\n")
    nieuw_historiek = DataRepository.get_last_historiek_device_limit(DeviceID, 1)[0]
    # print(nieuw_historiek)
    output = {"msg": "Niewe sensorwaarde", "DeviceID": nieuw_historiek["deviceID"], "datetime": str(nieuw_historiek["datum_en_tijd"]), "waarde": nieuw_historiek["waarde"]}
    # print(output)

    # output = {"msg": "Nieuw historiek", "historiek": nieuw_historiek}

    await sio.emit("B2F_new_sensorwaarde", output)

@sio.event
async def B2F_post_change(isPost):
    await sio.emit("B2F_post_change", isPost)

@sio.event
async def B2F_lock_change():
    await sio.emit("B2F_lock_change")

@sio.event
async def B2F_delaytime_change(deviceID, delaytime):
    output = {"msg": "new delaytime", "deviceID": deviceID, "delaytime": delaytime}
    await sio.emit("B2F_lock_change", output)

@sio.event
async def B2F_actuator_change(deviceID, value):
    output = {"deviceID": deviceID, "value": value}
    await sio.emit("B2F_actuator_change", output)






# ----------------------------------------------------
# Run the app
# ----------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:sio_app", host="0.0.0.0", port=8000, log_level="info", reload_dirs=["backend"])
