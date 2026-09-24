import time
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)

class Servo():

    def __init__(self, pin):
        self.__pin = pin
        GPIO.setup(self.__pin, GPIO.OUT)
        # self.__pwmServo = ""
        # self.__pwmServo = GPIO.PWM(self.__pin, 50)
        # self.__pwmServo.start(0)

    def write_servo(self, hoek):
        pwmServo = GPIO.PWM(self.__pin, 50)
        pwmServo.start(0)
        angle = ((hoek / 180) * 9) + 3
        pwmServo.ChangeDutyCycle(angle)
        time.sleep(0.15)
        pwmServo.stop()
    
    # def cleanup(self):
    #     self.__pwmServo.stop()

    
    
class Lock(Servo):
    def __init__(self, pin):
        super().__init__(pin)
    
    def close_lock(self):
        self.write_servo(180)
    
    def open_lock(self):
        self.write_servo(0)
    
    def cleanup(self):
        return super().cleanup()


class Flag(Servo):
    def __init__(self, pin, up_angle: int = 90):
        super().__init__(pin)
        self.up_angle = up_angle
    
    def flag_up(self):
        self.write_servo(self.up_angle)
    
    def flag_down(self):
        self.write_servo(0)
    
    def cleanup(self):
        return super().cleanup()



