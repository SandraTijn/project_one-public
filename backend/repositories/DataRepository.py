from .Database import Database


class DataRepository:
    # @staticmethod
    # def read_status_lampen():
    #     sql = "SELECT * from lampen"
    #     return Database.get_rows(sql)

    # @staticmethod
    # def read_status_lamp_by_id(id):
    #     sql = "SELECT * from lampen WHERE id = %s"
    #     params = [id]
    #     return Database.get_one_row(sql, params)

    # @staticmethod
    # def update_status_lamp(id, status):
    #     sql = "UPDATE lampen SET status = %s WHERE id = %s"
    #     params = [status, id]
    #     return Database.execute_sql(sql, params)

    # @staticmethod
    # def update_status_alle_lampen(status):
    #     sql = "UPDATE lampen SET status = %s"
    #     params = [status]
    #     return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_devices():
        sql = "SELECT * FROM Device where naam != 'oled'"
        return Database.get_rows(sql)

    @staticmethod
    def get_all_sensors():
        sql = "SELECT * FROM Device WHERE type = 'sensor'"
        return Database.get_rows(sql)

    @staticmethod
    def get_all_actuators():
        sql = "SELECT * FROM Device WHERE type = 'actuator'"
        return Database.get_rows(sql)
    
    @staticmethod
    def get_one_device(id):
        sql = "SELECT * FROM Device WHERE DeviceID = %s"
        params = [id]
        return Database.get_one_row(sql, params)
    
    @staticmethod
    def get_triggerwaarden_sensoren():
        sql = "SELECT DeviceID as deviceID, naam, triggerwaarde FROM Device WHERE naam = 'HX711' OR naam = 'LDR' "
        return Database.get_rows(sql)
    
    @staticmethod
    def get_one_triggerwaarde_sensor(deviceID):
        sql = "SELECT DeviceID as deviceID, naam, triggerwaarde FROM Device WHERE (naam = 'HX711' OR naam = 'LDR') and DeviceID = %s"
        params = [deviceID]
        return Database.get_one_row(sql, params)

    @staticmethod
    def wijzig_one_triggerwaarde(deviceID, nieuwe_waarde):
        sql = "UPDATE Device SET triggerwaarde = %s where deviceID = %s"
        params = [nieuwe_waarde, deviceID]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_users():
        sql = "SELECT rfidID, userID, name FROM User"
        return Database.get_rows(sql)
    
    @staticmethod
    def get_one_user(id):
        sql = "SELECT rfidID, userID, name FROM User WHERE UserID = %s"
        params = [id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_last_users(limit: int = 1):
        sql = "SELECT userID, datum_en_tijd FROM Historiek WHERE deviceID = 3 ORDER BY HistoriekID DESC LIMIT %s"
        params = [limit]
        return Database.get_rows(sql, params)
    
    @staticmethod
    def get_historiek():
        sql = "SELECT * FROM Historiek"
        return Database.get_rows(sql)
    
    @staticmethod
    def get_last_historiek_limit(limit: int):
        # sql = "SELECT * FROM Historiek ORDER BY HistoriekID ASC LIMIT %s"
        sql = "SELECT * FROM (SELECT * FROM Historiek ORDER BY HistoriekID DESC Limit %s) AS LastRows ORDER BY HistoriekID ASC"
        
        params = [int(limit)]
        return Database.get_rows(sql, params)
    
    @staticmethod
    def get_last_historiek_device_limit(deviceID, limit: int=1):
        # sql = "SELECT * FROM Historiek ORDER BY HistoriekID ASC LIMIT %s"
        sql = "SELECT * FROM (SELECT * FROM Historiek WHERE deviceID = %s ORDER BY HistoriekID DESC Limit %s) AS LastRows ORDER BY HistoriekID ASC"
        # sql = "select * from Historiek where deviceID = %s order by HistoriekID desc limit %s"
        params = [int(deviceID), int(limit)]
        return Database.get_rows(sql, params)
    
    @staticmethod
    def get_historiek_by_id(id: int):
        sql = "SELECT * FROM Historiek WHERE HistoriekID = %s"
        params = [id]
        return Database.get_one_row(sql, params)
    

    @staticmethod
    def add_sensorwaarde_database(DeviceID, waarde, comment: str = None):
        sql = "INSERT INTO Historiek (DeviceID, datum_en_tijd, waarde, comment) VALUES (%s, NOW(), %s, %s)"
        params = [DeviceID, waarde, comment]
        return Database.execute_sql(sql, params)
    
    @staticmethod
    def add_userunlock_database(userID, comment: str = None):
        sql = "INSERT INTO Historiek (DeviceID, datum_en_tijd, userID, comment) VALUES (3, NOW(), %s, %s)"
        params = [userID, comment]
        return Database.execute_sql(sql, params)
    
    @staticmethod
    def add_actuatoraction_database(DeviceID, actieID, waarde, comment: str = None):
        sql = "INSERT INTO Historiek (DeviceID, actieID, datum_en_tijd, waarde, comment) VALUES (%s, %s, NOW(), %s, %s)"
        params = [DeviceID, actieID, waarde, comment]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_last_levering(limit: int = 1):
        sql = "select datum_en_tijd from Historiek where deviceID = 4 and waarde > (select triggerwaarde from Device where DeviceID = 4) order by HistoriekID desc limit %s"
        params = [limit]
        return Database.get_rows(sql, params)

    @staticmethod
    def get_all_delaytimes():
        sql = "select DeviceID, naam, delaytime from Device where delaytime is not null"
        return Database.get_rows(sql)
    
    @staticmethod
    def get_delaytime(deviceID):
        sql = "select DeviceID, naam, delaytime from Device where DeviceID = %s"
        params = [deviceID]
        return Database.get_one_row(sql, params)

    @staticmethod
    def wijzig_delaytime(deviceID, delaytime):
        sql = "UPDATE Device SET delaytime = %s where deviceID = %s"
        params = [delaytime, deviceID]
        return Database.execute_sql(sql, params)


    