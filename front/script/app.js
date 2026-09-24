'use strict';
const lanIP = `http://${window.location.hostname}:8000/api/v1`;
const shortLanIP = `http://${window.location.hostname}:8000`; 
const socketio = io(shortLanIP);

// #region ***  DOM references                           ***********
let infoOverview, lichtvalue, gewichtvalue, lockopen, lockclosed, flagstate, klepstate, ledstate, lastusername, lastusertime;

let homepage, settingspage, infopage

let isLockOpen;
let keuzemenuPagina = 0;
let currentChart = null;

const lockTimeMin = 0;
const lockTimeMax = 60;

const weightTimeMin = 5;
const weightTimeMax = 60;

const weightTriggerMin = 1;
const weightTriggerMax = 500;

const oledTimeMin = 0;
const oledTimeMax = 30;

const ldrTimeMin = 5;
const ldrTimeMax = 20;

const ldrTriggerMin = 1
const ldrTriggerMax = 90

const amountChart = 20;



const loadOverview = async() => {
    infoOverview = document.querySelector(".js-overview");

    lichtvalue = document.querySelector(".js-lichtvalue");
    // console.log(lichtvalue)
    gewichtvalue = document.querySelector(".js-weightvalue");
    lockopen = document.querySelector(".js-lock-open");
    lockclosed = document.querySelector(".js-lock-closed");
    flagstate = document.querySelector(".js-flagstate");
    klepstate = document.querySelector(".js-klepstate");
    ledstate = document.querySelector(".js-ledstate");
    lastusername = document.querySelector(".js-lastuser-name");
    lastusertime = document.querySelector(".js-lastuser-time");

}
// #endregion

// #region ***  Callback-Visualisation - show___         ***********
const showOverview = async(result_list, user_data) => {
    // console.log("show overview");
    // console.log(result_list)

    let tempLichtwaarde, tempweightvalue, tempLockstate, tempFlagstate, tempLedstate, tempKlepstate, tempLastusername, tempLastusertime
    let lichtID, weightID, flagID, ledID, klepID

    for (const device of result_list){
        const devicename = device[1]
        // console.log(devicename);
        if (devicename == "LDR"){
            tempLichtwaarde = device[3]
            lichtID = device[0];
        }
        if (devicename == "flag"){
            tempFlagstate = device[3]
            flagID = device[0];
            if (tempFlagstate == false){
                tempFlagstate = "Neer";
            }
            else{
                tempFlagstate = "Op";
            }
        }
        if (devicename == "HX711"){
            weightID = device[0];
            tempweightvalue = device[3]
        }
        if (devicename == "reed-switch"){
            tempKlepstate = device[3]
            klepID = device[0];
            if (tempKlepstate == false){
                tempKlepstate = "Dicht";
            }
            else {
                tempKlepstate = "Open";
            }
        }
        if (devicename == "led"){
            tempLedstate = device[3]
            ledID = device[0];
            if (tempLedstate == false){
                tempLedstate = "Uit";
            }
            else {
                tempLedstate = "Aan";
            }
        }
        if (devicename == "lock"){
            tempLockstate = device[3]
            if (tempLockstate === 0){
                tempLockstate = true;
                isLockOpen = true
            }
            else {
                tempLockstate = false;
                isLockOpen = false;
            }
            // console.log(tempLockstate)
        }
        }

        
    

        // 2025-05-27T13:00:00
    // const user_data = getLastUser();
    tempLastusername = user_data["username"];
    tempLastusertime = user_data["datum_en_tijd"].substr(11, 5);
    // console.log(tempLastusername);
    // console.log(tempLastusertime);



    let outputString = `<div class="c-info-single">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 12C18.2 12 20 13.8 20 16C20 18.2 18.2 20 16 20C13.8 20 12 18.2 12 16C12 13.8 13.8 12 16 12ZM16 9.33334C12.32 9.33334 9.33331 12.32 9.33331 16C9.33331 19.68 12.32 22.6667 16 22.6667C19.68 22.6667 22.6666 19.68 22.6666 16C22.6666 12.32 19.68 9.33334 16 9.33334ZM2.66665 17.3333H5.33331C6.06665 17.3333 6.66665 16.7333 6.66665 16C6.66665 15.2667 6.06665 14.6667 5.33331 14.6667H2.66665C1.93331 14.6667 1.33331 15.2667 1.33331 16C1.33331 16.7333 1.93331 17.3333 2.66665 17.3333ZM26.6666 17.3333H29.3333C30.0666 17.3333 30.6666 16.7333 30.6666 16C30.6666 15.2667 30.0666 14.6667 29.3333 14.6667H26.6666C25.9333 14.6667 25.3333 15.2667 25.3333 16C25.3333 16.7333 25.9333 17.3333 26.6666 17.3333ZM14.6666 2.66668V5.33334C14.6666 6.06668 15.2666 6.66668 16 6.66668C16.7333 6.66668 17.3333 6.06668 17.3333 5.33334V2.66668C17.3333 1.93334 16.7333 1.33334 16 1.33334C15.2666 1.33334 14.6666 1.93334 14.6666 2.66668ZM14.6666 26.6667V29.3333C14.6666 30.0667 15.2666 30.6667 16 30.6667C16.7333 30.6667 17.3333 30.0667 17.3333 29.3333V26.6667C17.3333 25.9333 16.7333 25.3333 16 25.3333C15.2666 25.3333 14.6666 25.9333 14.6666 26.6667ZM7.98665 6.10668C7.46665 5.58668 6.61331 5.58668 6.10665 6.10668C5.58665 6.62668 5.58665 7.48001 6.10665 7.98668L7.51998 9.40001C8.03998 9.92001 8.89331 9.92001 9.39998 9.40001C9.90665 8.88001 9.91998 8.02668 9.39998 7.52001L7.98665 6.10668ZM24.48 22.6C23.96 22.08 23.1066 22.08 22.6 22.6C22.08 23.12 22.08 23.9733 22.6 24.48L24.0133 25.8933C24.5333 26.4133 25.3866 26.4133 25.8933 25.8933C26.4133 25.3733 26.4133 24.52 25.8933 24.0133L24.48 22.6ZM25.8933 7.98668C26.4133 7.46668 26.4133 6.61334 25.8933 6.10668C25.3733 5.58668 24.52 5.58668 24.0133 6.10668L22.6 7.52001C22.08 8.04001 22.08 8.89334 22.6 9.40001C23.12 9.90668 23.9733 9.92001 24.48 9.40001L25.8933 7.98668ZM9.39998 24.48C9.91998 23.96 9.91998 23.1067 9.39998 22.6C8.87998 22.08 8.02665 22.08 7.51998 22.6L6.10665 24.0133C5.58665 24.5333 5.58665 25.3867 6.10665 25.8933C6.62665 26.4 7.47998 26.4133 7.98665 25.8933L9.39998 24.48Z" fill="#252B2D"/>
                    </svg>
                    <p class="c-info__bold_text js-lichtvalue js-datavalue" data-deviceID = "${lichtID}">${tempLichtwaarde}%</p>
                </div>

                <div class="c-info-single">
                    <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
                    <path d="M19 14.6667V10.6667C25.08 9.89332 29.6667 6.53332 29.6667 2.66666H3C3 6.53332 7.58667 9.89332 13.6667 10.6667V14.6667C8.76 15.64 3 19.48 3 29.3333H11V26.6667H5.84C7.08 17.56 14.7067 17.0667 16.3333 17.0667C17.96 17.0667 25.5867 17.56 26.8267 26.6667H21.6667V29.3333H29.6667C29.6667 19.48 23.9067 15.64 19 14.6667ZM25.4933 5.33332C23.6667 6.91999 20.3333 8.15999 16.3333 8.15999C12.3333 8.15999 9 6.91999 7.17333 5.33332H25.4933ZM16.3333 29.3333C14.8667 29.3333 13.6667 28.1333 13.6667 26.6667C13.6667 25.9333 13.96 25.2667 14.4533 24.7867C15.52 23.72 21.6667 21.3333 21.6667 21.3333C21.6667 21.3333 19.28 27.48 18.2133 28.5467C17.7333 29.04 17.0667 29.3333 16.3333 29.3333Z" fill="#252B2D"/>
                    </svg>
                    <p class="c-info__bold_text js-weightvalue js-datavalue" data-deviceID = "${weightID}">${tempweightvalue}g</p>
                </div>

                <div class="c-info-single">
                    <p class="c-info__regular_text">Slot</p>
                    <div class="c-info-lock-closed  js-lock_closed `;

                    if (!tempLockstate){
                        outputString += `c--hidden`;
                    }


                    outputString += `">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="31" viewBox="0 0 30 31" fill="none">
                        <path d="M22.5 11.125H21.25V8.625C21.25 5.175 18.45 2.375 15 2.375C11.55 2.375 8.75 5.175 8.75 8.625V11.125H7.5C6.125 11.125 5 12.25 5 13.625V26.125C5 27.5 6.125 28.625 7.5 28.625H22.5C23.875 28.625 25 27.5 25 26.125V13.625C25 12.25 23.875 11.125 22.5 11.125ZM11.25 8.625C11.25 6.55 12.925 4.875 15 4.875C17.075 4.875 18.75 6.55 18.75 8.625V11.125H11.25V8.625ZM22.5 26.125H7.5V13.625H22.5V26.125ZM15 22.375C16.375 22.375 17.5 21.25 17.5 19.875C17.5 18.5 16.375 17.375 15 17.375C13.625 17.375 12.5 18.5 12.5 19.875C12.5 21.25 13.625 22.375 15 22.375Z" fill="#252B2D"/>
                        </svg>
                    </div>
                    <div class="c-info-lock-open js-lock_open `;
                    
                    if (tempLockstate){
                        outputString += `c--hidden`;
                    }

                    outputString += `">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="31" viewBox="0 0 30 31" fill="none">
                        <path d="M22.5 11.125H21.25V8.625C21.25 5.175 18.45 2.375 15 2.375C11.55 2.375 8.75 5.175 8.75 8.625H11.25C11.25 6.55 12.925 4.875 15 4.875C17.075 4.875 18.75 6.55 18.75 8.625V11.125H7.5C6.125 11.125 5 12.25 5 13.625V26.125C5 27.5 6.125 28.625 7.5 28.625H22.5C23.875 28.625 25 27.5 25 26.125V13.625C25 12.25 23.875 11.125 22.5 11.125ZM22.5 26.125H7.5V13.625H22.5V26.125ZM15 22.375C16.375 22.375 17.5 21.25 17.5 19.875C17.5 18.5 16.375 17.375 15 17.375C13.625 17.375 12.5 18.5 12.5 19.875C12.5 21.25 13.625 22.375 15 22.375Z" fill="#252B2D"/>
                        </svg>
                    </div>
                </div>

                <div class="c-info-single">
                    <p class="c-info__regular_text">Vlag</p>
                    <p class="c-info__bold_text js-flagstate js-datavalue" data-deviceID = "${flagID}">${tempFlagstate}</p>
                </div>

                <div class="c-info-single">
                    <p class="c-info__regular_text">Klep</p>
                    <p class="c-info__bold_text js-klepstate js-datavalue" data-deviceID = "${klepID}">${tempKlepstate}</p>
                </div>

                <div class="c-info-single">
                    <p class="c-info__regular_text">LED</p>
                    <p class="c-info__bold_text js-ledstate js-datavalue" data-deviceID = "${ledID}">${tempLedstate}</p>
                </div>

                <div class="c-info-big js-last-user">
                    <p class="c-info__regular_text">Laatste user</p>
                    <p class="c-info__bold_text js-lastuser-name">${tempLastusername}</p>
                    <p class="c-info__regular_text js-lastuser-time">${tempLastusertime}</p>
                </div>`;

                infoOverview.innerHTML = outputString;
                


    
}

const showIfPost = async(isPost) => {
    const isPostIcon = document.querySelector(".js-poststatus-icon--post");
    const noPostIcon = document.querySelector(".js-poststatus-icon--no-post");
    const isPostText = document.querySelector(".js-poststatus-message");
    // console.log(isPostIcon);
    // console.log(isPost);
    
    if (isPost){
        // console.log("er is post");
        isPostIcon.classList.remove("c--hidden");
        noPostIcon.classList.add("c--hidden");

        isPostText.innerHTML = "Je hebt post!"
    }
    else {
        // console.log("er is geen post");
        isPostIcon.classList.add("c--hidden");
        noPostIcon.classList.remove("c--hidden");

        isPostText.innerHTML = "Geen post op dit moment!"
    }
    // console.log(isPostIcon);

}

const showLaatsteLeging = async () =>  {
    const url = `${lanIP}/lastusers/1/`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));
    const time = json[0]["datum_en_tijd"].substr(11, 5);

    const laatsteLeging = document.querySelector(".js-leging-time");
    laatsteLeging.innerHTML = time;
}

const showLaatsteLevering = async() => {
    const url = `${lanIP}/levering/1/`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));
    
    const laatsteLevering = document.querySelector(".js-levering-time");
    console.log(json);
    const tijd = json[0]["laatsteLevering"].substr(11, 5);
    laatsteLevering.innerHTML = tijd;
}

const showLockStatus = async () => {
    const unlockButton = document.querySelector(".js-lock-button");
    const buttonTekst = document.querySelector(".js-lock-button__text");
    // const lockbuttonOpen = document.querySelector(".c-lockbutton__open");
    // const lockbuttonClosed = document.querySelector(".c-lockbutton__closed");
    const lockStatus = document.querySelector(".js-brievenbus-status");
    console.log(isLockOpen);

    if (isLockOpen){
        unlockButton.title = "sluit slot"
        console.log(unlockButton.title)
        // lockbuttonOpen.classList.remove("c--hidden");
        // lockbuttonClosed.classList.add("c--hidden");
        lockStatus.innerHTML = "Brievenbus open";
        buttonTekst.innerHTML = "Sluit slot"
    }
    else {
        unlockButton.title = "open slot"
        // lockbuttonOpen.classList.add("c--hidden");
        // lockbuttonClosed.classList.remove("c--hidden");
        lockStatus.innerHTML = "Brievenbus dicht";
        buttonTekst.innerHTML = "Open slot"
    }

}

const showActiveKeuzemenu = async (deviceID) => {
    const keuzemenuKeuzes = document.querySelectorAll(".js-device-selector");
    if (window.currentChart) {
        window.currentChart.destroy();
        window.currentChart = null;
    }

    for (const keuze of keuzemenuKeuzes){
        keuze.classList.remove("c-device-selector__icon--active");
    }

    if (deviceID != 0){
        const activeMenu = document.querySelector(`.js-device-selector[data-device="${deviceID}"]`);
        // console.log(activeMenu);
        activeMenu.classList.add("c-device-selector__icon--active");
    }

    const outputField = document.querySelector(".js-info-device-output");
    outputField.innerHTML = "";

}

const showChart = async (area, meeteenheid, json) => { 
    let tijd = [];
    let waarden = [];
    let minimum = json[0]["waarde"];
    let maximum = 0;

    if (window.currentChart) {
        window.currentChart.destroy();
        window.currentChart = null;
    }


    for (const historiek of json){
        const waarde = historiek["waarde"]
        const historiekTijd = historiek["datum_en_tijd"]
        if (maximum < waarde){
            maximum = waarde;
        }
        if (minimum > waarde){
            minimum = waarde;
        }

        tijd.push(historiek["datum_en_tijd"].substr(11, 5)); // alleen HH:MM
        waarden.push(historiek["waarde"]);

        // console.log(waarden);

    }

    // let options = {
    //         series: arrWaarden,
    //         chart: {
    //         height: 650,
    //         type: 'line',
    //         dropShadow: {
    //             enabled: true,
    //             color: '#000',
    //             top: 18,
    //             left: 7,
    //             blur: 10,
    //             opacity: 0.5,
    //         },
    //         zoom: {
    //             enabled: false,
    //         },
    //         toolbar: {
    //             show: false,
    //         },
    //         },
    //         colors: ['#e96666'],
    //         dataLabels: {
    //         enabled: true,
    //         },
    //         stroke: {
    //         curve: 'smooth',
    //         },
    //         grid: {
    //         borderColor: '#e7e7e7',
    //         row: {
    //             colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
    //             opacity: 0.5,
    //         },
    //         },
    //         markers: {
    //         size: 1,
    //         },
    //         xaxis: {
    //         categories: tijd,
    //         title: {
    //             text: 'Years',
    //         },
    //         },
    //         yaxis: {
    //         title: {
    //             text: 'Price',
    //         },
    //         min: 0,
    //         max: maximum + 200,
    //         },
    //         legend: {
    //         position: 'top',
    //         horizontalAlign: 'right',
    //         floating: true,
    //         offsetY: -25,
    //         offsetX: -5,
    //         },
    //     };

    let options = {
        series: [{
            name: "Waarden",
            data: waarden
        }],
        chart: {
            type: 'line',
            // height: 256,
            height: 350,
            animations: { enabled: false },
            dropShadow: {
                enabled: false,
                color: '#000',
                top: 18,
                left: 7,
                blur: 10,
                opacity: 0.5,
            },
            zoom: {
                enabled: false,
            },
            toolbar: {
                show: false,
            },
        },
        colors: ['#009bcb'],
            dataLabels: {
            // enabled: true,
            },
            stroke: {
            // curve: 'smooth',
            },
        xaxis: {
            categories: tijd,
            title: { text: 'Tijd' }
        },
        yaxis: {
            title: { text: meeteenheid }
        }
    };

        window.currentChart = new ApexCharts(area, options);
        window.currentChart.render();





}

const showInfoDevice = async (deviceID) => {
    console.log(`showInfoDevice => ${deviceID}`);
    const outputField = document.querySelector(".js-info-device-output");
    outputField.innerHTML = "";

    if (deviceID == 3){
        // RFID
        const url = `${lanIP}/lastusers/5`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        // console.log(json[0]["datum_en_tijd"].substr(8, 2));

        let outputString = `<p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Laatste users</p><div class="c-last-users">`

        for (const user of json){
            console.log(user);
            const datum = user["datum_en_tijd"].substr(8, 2) + "/" + user["datum_en_tijd"].substr(5, 2);
            const username = user["username"];
            const tijd = user["datum_en_tijd"].substr(11, 5)

            outputString += `<div class="c-info-big__listitem">
                                <p class="c-info__regular_text">${datum}</p>
                                <p class="c-info__bold_text js-lastuser-name">${username}</p>
                                <p class="c-info__regular_text js-lastuser-time">${tijd}</p>
                            </div>`;

        }
        outputString += `</div>`;

        outputField.innerHTML = outputString;

    }

    if (deviceID == 4){
        // weightsensor
        console.log("klaar voor 4")
        const url = `${lanIP}/historiek_device_limit/4/${amountChart}`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        showChart(outputField, "gram", json);
    }

    if (deviceID == 6){
        // LDR
        console.log("klaar voor 6")
        const url = `${lanIP}/historiek_device_limit/6/${amountChart}`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        showChart(outputField, "%", json);
    }

    if (deviceID == 5){
        // klep
        console.log("klaar voor 5")
        const url = `${lanIP}/historiek_device_limit/5/5`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        json.reverse()

        let outputString = `<p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Status klep</p><div class="c-last-reed">`

        for (const waarde of json){
            const datum = waarde["datum_en_tijd"].substr(8, 2) + "/" + waarde["datum_en_tijd"].substr(5, 2);
            const stateWaarde = waarde["waarde"];
            const tijd = waarde["datum_en_tijd"].substr(11, 8)

            outputString += `<div class="c-info-big__listitem"><p class="c-info__bold_text">`;
            if (stateWaarde){
                outputString += `Open`
            }
            else {
                outputString += `Dicht`
            }
            outputString += `</p>
                                <p class="c-info__regular_text">${datum}</p>
                                <p class="c-info__regular_text">${tijd}</p>
                            </div>`;

        }
        outputString += `</div>`;

        outputField.innerHTML = outputString;
    }



}

const showSettingsDevice = async (deviceID) => {
    console.log(`showSettingsDevice => ${deviceID}`);
    const outputField = document.querySelector(".js-info-device-output");
    outputField.innerHTML = "";

    if (deviceID == 3){
        // RFID/lock

        let url = `${lanIP}/delay/1`;
        let response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        let json = await response.json().catch((err) => console.error('JSON-error:', err));
        const delayTime = json["delaytime"];

        url = `${lanIP}/users/`;
        response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        json = await response.json().catch((err) => console.error('JSON-error:', err));
        
        let outputString = `<p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Toegevoegde RFID-tags</p><div class="c-settings-users-list">`;
        
        for (const user of json){
            const username = user["name"];
            let rfidID = user["rfidID"]
            if (!rfidID){
                rfidID = "---";
            }

            outputString += `
                        <div class="c-info-big__listitem-settings">
                            <p class="c-info__bold_text js-lastuser-name">${username}</p>
                            <p class="c-info__regular_text c-rfid">${rfidID}</p>
                        </div>`;
        }
        
        // Time zit bij lock => data-deviceID = 1 i.p.v. 3
        outputString += `</div>
        <div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Minimale tijd slot open</p>
                            <div class="c-changer">

                                <!-- <div class="c-changer__value">15s</div> -->

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "1" data-kind="time">${delayTime}s</div>

                                <input class="c-changer__value js-changer-value" data-deviceID = "1" type="number" name="getal" step="1" min="${lockTimeMin}" max="${lockTimeMax}" value="${delayTime}" data-kind="time"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "1" data-kind="time">
                                    <p class="c-changer__button__text">Bevestig</p>
                                </div>

                            </div>

                            <div class="js-change-feedback"></div>

                        </div>`
        outputField.innerHTML = outputString;

        

    }
    if (deviceID == 4){

        let url = `${lanIP}/historiek_device_limit/4/1/`;
        let response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        let json = await response.json().catch((err) => console.error('JSON-error:', err));
        let currentValue = json[0]["waarde"];

        url = `${lanIP}/triggerwaarde/4`;
        response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        json = await response.json().catch((err) => console.error('JSON-error:', err));
        const currentTriggerwaarde = json["triggerwaarde"];

        url = `${lanIP}/delay/4`;
        response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        json = await response.json().catch((err) => console.error('JSON-error:', err));
        const delayTime = json["delaytime"];

        let outputString = `<div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Tijd tussen metingen</p>
                            <div class="c-changer">

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "${deviceID}" data-kind="time">${delayTime}s</div>

                                <input class="c-changer__value js-changer-value" type="number" name="getal" step="1" min="${weightTimeMin}" max="${weightTimeMax}" value="${delayTime}" data-deviceID = "${deviceID}" data-kind="time"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "${deviceID}" data-kind="time">
                                    <p class="c-changer__button__text" >Bevestig</p>
                                </div>

                            </div>

                        </div>

                        <div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Triggerwaarde gewichtsensor</p>
                            <div class="c-changer">

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "${deviceID}" data-kind="trigger">${currentValue}g</div>

                                <input class="c-changer__value js-changer-value" type="number" name="getal" step="1" min="${weightTriggerMin}" max="${weightTriggerMax}" value="${currentTriggerwaarde}" data-deviceID = "${deviceID}" data-kind="trigger"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "${deviceID}" data-kind="trigger">
                                    <p class="c-changer__button__text" >Bevestig</p>
                                </div>

                            </div>

                        </div>
                        
                        <div class="js-change-feedback"></div>`;
                        outputField.innerHTML = outputString;
    }

    if (deviceID == 9){
        const url = `${lanIP}/delay/9`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        const delayTime = json["delaytime"];
        console.log(delayTime);

        const outputString = `</div>
        <div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Tijd scherm aan</p>
                            <div class="c-changer">

                                <!-- <div class="c-changer__value">15s</div> -->

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "9" data-kind="time">${delayTime}s</div>

                                <input class="c-changer__value js-changer-value" data-deviceID = "9" type="number" name="getal" step="1" min="${oledTimeMin}" max="${oledTimeMax}" value="${delayTime}" data-kind="time"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "9" data-kind="time">
                                    <p class="c-changer__button__text">Bevestig</p>
                                </div>

                            </div>

                            <div class="js-change-feedback"></div>

                        </div>`
        outputField.innerHTML = outputString;
    }

    if (deviceID == 6){
        let url = `${lanIP}/triggerwaarde/6`;
        let response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        let json = await response.json().catch((err) => console.error('JSON-error:', err));
        const currentTriggerwaarde = json["triggerwaarde"];

        url = `${lanIP}/historiek_device_limit/6/1/`;
        response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        json = await response.json().catch((err) => console.error('JSON-error:', err));
        const currentValue = json[0]["waarde"];

        url = `${lanIP}/delay/6`;
        response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        json = await response.json().catch((err) => console.error('JSON-error:', err));
        const delayTime = json["delaytime"];

        const outputString = `<div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Tijd tussen metingen</p>
                            <div class="c-changer">

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "${deviceID}" data-kind="time">${delayTime}s</div>

                                <input class="c-changer__value js-changer-value" type="number" name="getal" step="1" min="${ldrTimeMin}" max="${ldrTimeMax}" value="${delayTime}" data-deviceID = "${deviceID}" data-kind="time"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "${deviceID}" data-kind="time">
                                    <p class="c-changer__button__text" >Bevestig</p>
                                </div>

                            </div>
        
                <div class="c-settings-change">
                            <p class="c-subtitle u-subtitle--more-margin-top js-changer-title">Triggerwaarde lichtsensor</p>
                            <div class="c-changer">

                                <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceID = "${deviceID}" data-kind="trigger">${currentValue}%</div>

                                <input class="c-changer__value js-changer-value" type="number" name="getal" step="1" min="${ldrTriggerMin}" max="${ldrTriggerMax}" value="${currentTriggerwaarde}" data-deviceID = "${deviceID}" data-kind="trigger"/>

                                <div class="c-changer__button js-changer-button" data-deviceID = "${deviceID}" data-kind="trigger">
                                    <p class="c-changer__button__text" >Bevestig</p>
                                </div>

                            </div>

                        </div>
                        
                        <div class="js-change-feedback"></div>`;
        outputField.innerHTML = outputString;




    }

    if (deviceID == 2){
        const url = `${lanIP}/historiek_device_limit/2/1`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        const waarde = json[0]["waarde"];
        let text = ``;
        let dataValue;
        if (waarde){
            text = "Vlag neer";
            dataValue = false;
        }   
        else{
            text = "Vlag op";
            dataValue = true;
        }

        const outputString = `<div class="c-changer__button js-changer-button" data-deviceID = "1" data-value="${dataValue}">
                                    <p class="c-changer__button__text js-button-text">${text}</p>
                                </div><div class="js-change-feedback"></div>`;

        outputField.innerHTML = outputString;

    }

    if (deviceID == 7){
        console.log("777")
        const url = `${lanIP}/historiek_device_limit/7/1`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));
        const waarde = json[0]["waarde"];
        let text = ``;
        let dataValue;
        if (waarde){
            text = "LED OFF";
            dataValue = false;
        }   
        else{
            text = "LED ON";
            dataValue = true;
        }

        const outputString = `<div class="c-changer__button js-changer-button" data-deviceID = "1" data-value="${dataValue}">
                                    <p class="c-changer__button__text js-button-text">${text}</p>
                                </div><div class="js-change-feedback"></div>`;

        outputField.innerHTML = outputString;
    }



    listenToValuebutton(deviceID);

}





// #endregion

// #region ***  Callback-No Visualisation - callback___  ***********
// #endregion

// #region ***  Data Access - get___                     ***********
const getDevices = async () => {
    // console.log("getDevices");
    const url = `${lanIP}/devices`;
    // console.log(url);
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));

    // console.log(json);
    get_last_data(json);


}
const get_last_data = async (jsonObject) => {
    // console.log("get_last_data");
    let result_list = [];
    for (const device of jsonObject){

        const deviceID = device["DeviceID"];
        const url = `${lanIP}/historiek_device_limit/${deviceID}/1/`;
        const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));

        console.log(json);

        let device_list = [deviceID, device["naam"], json[0]["datum_en_tijd"], json[0]["waarde"]];
        result_list.push(device_list);
    }
    getLastUserandShhow(result_list);
}

const getLastUserandShhow = async (result_list) => {
    const url = `${lanIP}/lastusers/1/`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));
    // console.log(json[0]);
    // return result_list, json[0]
    showOverview(result_list, json[0])

}

const getLastUserNoShow = async () => {
    const url = `${lanIP}/lastusers/1/`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));
    // console.log(json[0]);
    // return result_list, json[0]
    return json[0]
}

const getIsPost = async () => {
    // console.log("is post?");
    const url = `${lanIP}/post`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));

    console.log(json["isPost"]);
    showIfPost(json["isPost"]);
}

const getLockStatus = async () => {
    console.log("getLockStatus")
    const url = `${lanIP}/historiek_device_limit/1/1/`;
    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
    const json = await response.json().catch((err) => console.error('JSON-error:', err));

    // return json[0]["waarde"];
    console.log(`waarde: ${json[0]["waarde"]}`);
    isLockOpen = json[0]["waarde"];
    showLockStatus(json[0]["waarde"]);
}


// #endregion

// #region ***  Event Listeners - listenTo___            ***********

const listenToUnlockbutton = async () => {
    const unlockButton = document.querySelector(".js-lock-button");
    const buttonTekst = document.querySelector(".js-lock-button__text");
    // const lockbuttonOpen = document.querySelector(".c-lockbutton__open");
    // const lockbuttonClosed = document.querySelector(".c-lockbutton__closed");
    const lockStatus = document.querySelector(".js-brievenbus-status");

    unlockButton.addEventListener("click", async () => {
        console.log("unlock button pressed!");
        isLockOpen = !isLockOpen;
        console.log(isLockOpen);

        if (isLockOpen){
            // lockbuttonOpen.classList.remove("c--hidden");
            // lockbuttonClosed.classList.add("c--hidden");
            lockStatus.innerHTML = "Brievenbus open";
            buttonTekst.innerHTML = "Sluit slot"

            // 1 is open
            const url = `${lanIP}/lock/1`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }).catch((err) => console.error('Fetch-error:', err));
            const json = await response.json().catch((err) => console.error('JSON-error:', err));
        }
        else {
            // lockbuttonOpen.classList.add("c--hidden");
            // lockbuttonClosed.classList.remove("c--hidden");
            lockStatus.innerHTML = "Brievenbus dicht";
            buttonTekst.innerHTML = "Open slot";

            const url = `${lanIP}/lock/0`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }).catch((err) => console.error('Fetch-error:', err));
            const json = await response.json().catch((err) => console.error('JSON-error:', err));
        }

    })



}

const listenToMenu = async () => {
    console.log("listenToMenu");
    const outputField = document.querySelector(".js-info-device-output");
    outputField.innerHTML = "";

    const keuzemenuKeuzes = document.querySelectorAll(".js-device-selector");
    showActiveKeuzemenu(0);

    for (const keuze of keuzemenuKeuzes){
        keuze.addEventListener("click", async () => {
            const deviceID = keuze.dataset.device;
            keuzemenuPagina = deviceID;
            showActiveKeuzemenu(deviceID);
            
            // console.log(deviceID);

            if (infopage){
                showInfoDevice(deviceID);
                console.log(keuzemenuPagina)
            }

            if (settingspage){
                console.log(keuzemenuPagina);
                showSettingsDevice(deviceID);
            }


        })
    }


}

const listenToValuebutton = async (deviceID) => {
    const valueButtons = document.querySelectorAll(".js-changer-button");
    const feedbackField = document.querySelector(".js-change-feedback");

    for (const btn of valueButtons){
        btn.addEventListener("click", async () => {
        feedbackField.classList.remove("c--hidden");
        
        
        if (deviceID == 3){
            const valueField = document.querySelector(".js-changer-value");
            const valueValue = valueField.value;
            const deviceID = valueField.dataset.deviceid;
            console.log(valueValue);


            if (valueValue >= lockTimeMin && valueValue <= lockTimeMax){

                const url = `${lanIP}/delay`;
                const body = JSON.stringify({deviceID: 1,delaytime: valueValue});
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                }
                

            }
            else if(valueValue <= lockTimeMin) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te klein (>= 0)"
            }
            else if (valueValue >= lockTimeMax) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te groot (<= 60)"
            }
            else {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
            }
        }

        if (deviceID == 4){
            console.log(btn.dataset.kind)
            if (btn.dataset.kind === "time"){
                console.log("button 4 voor tijd");
                const valueField = document.querySelector(".js-changer-value[data-kind='time']");
                const deviceID = valueField.dataset.deviceid;
                const valueValue = valueField.value;
                console.log(valueValue);

                if (valueValue >= weightTimeMin && valueValue <= weightTimeMax){

                const url = `${lanIP}/delay`;
                const body = JSON.stringify({deviceID: deviceID, delaytime: valueValue});
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                }
                

            }
            else if(valueValue <= weightTimeMin) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te klein (>= 5)"
            }
            else if (valueValue >= weightTimeMax) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te groot (<= 60)"
            }
            else {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
            }





            }

            if (btn.dataset.kind === "trigger"){
                console.log("trigger button");
                const valueField = document.querySelector(".js-changer-value[data-kind='trigger']");
                const deviceID = valueField.dataset.deviceid;
                const valueValue = valueField.value;
                console.log(valueValue);

                if (valueValue >= weightTriggerMin && valueValue <= weightTriggerMax){

                const url = `${lanIP}/triggerwaarde/`;
                const body = JSON.stringify({deviceID: deviceID, triggerwaarde: valueValue});
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                }
                

            }
            else if(valueValue <= weightTriggerMin) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te klein (>= 5)"
            }
            else if (valueValue >= weightTriggerMax) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te groot (<= 500)"
            }
            else {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
            }
            }
        }

        if (deviceID == 9){
            console.log("gedrukt op knop voor 9")

            const valueField = document.querySelector(".js-changer-value");
            const valueValue = valueField.value;
            const deviceID = valueField.dataset.deviceid;
            console.log(valueValue);


            if (valueValue >= oledTimeMin && valueValue <= oledTimeMax){

                const url = `${lanIP}/delay`;
                const body = JSON.stringify({deviceID: 9,delaytime: valueValue});
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                }
                

            }
            else if(valueValue <= oledTimeMin) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te klein (>= 0)"
            }
            else if (valueValue >= oledTimeMax) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te groot (<= 30)"
            }
            else {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
            }

        }

        if (deviceID == 6){

            if (btn.dataset.kind === "time"){
                console.log("button 6 voor tijd");
                const valueField = document.querySelector(".js-changer-value[data-kind='time']");
                const deviceID = valueField.dataset.deviceid;
                const valueValue = valueField.value;
                console.log(valueValue);

                if (valueValue >= ldrTimeMin && valueValue <= ldrTimeMax){

                const url = `${lanIP}/delay`;
                const body = JSON.stringify({deviceID: deviceID, delaytime: valueValue});
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                }
                

            }
            else if(valueValue <= ldrTimeMin) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te klein (>= 1)"
            }
            else if (valueValue >= ldrTimeMax) {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Value te groot (<= 20)"
            }
            else {
                feedbackField.classList.add("c-change_feedback");
                feedbackField.classList.remove("u--success");
                feedbackField.classList.add("u--error");
                feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
            }





            }


            if (btn.dataset.kind === "trigger") {
                // console.log("LDR bevestiging button");
                const valueField = document.querySelector(".js-changer-value[data-kind='trigger']");
                const deviceID = valueField.dataset.deviceid;
                const valueValue = valueField.value;
                console.log(valueValue);

                if (valueValue >= ldrTriggerMin && valueValue <= ldrTriggerMax){

                const url = `${lanIP}/triggerwaarde/`;
                const body = JSON.stringify({deviceID: deviceID, triggerwaarde: valueValue});
                const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: body
                }).catch((err) => console.error('Fetch-error:', err));
                const json = await response.json().catch((err) => console.error('JSON-error:', err));

                console.log(json);

                if (json.detail){
                    feedbackField.classList.add("c--hidden");
                }

                if (json){
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.add("u--success");
                    feedbackField.classList.remove("u--error");
                    feedbackField.innerHTML = "&#10004; Value aangepast"
                    valueField.value = valueValue;
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Fout met backend";
                    }
                    

                }
                else if(valueValue <= ldrTriggerMin) {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Value te klein (>= 10)"
                }
                else if (valueValue >= ldrTriggerMax) {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Value te groot (<= 90)"
                }
                else {
                    feedbackField.classList.add("c-change_feedback");
                    feedbackField.classList.remove("u--success");
                    feedbackField.classList.add("u--error");
                    feedbackField.innerHTML = "&#10006; Iets onbekend is misgegaan :("
                }
            }
            


        }

        if (deviceID == 2){
            console.log("2")
            const url = `${lanIP}/actuator/`;
            const body = JSON.stringify({ deviceID: 2, value: btn.dataset.value });
            console.log(body)
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            }).catch((err) => console.error('Fetch-error:', err));
            const json = await response.json().catch((err) => console.error('JSON-error:', err));
            // console.log(btn.dataset.value)
            // console.log(!btn.dataset.value)
            let newValue;
            console.log(`>>>>>${btn.dataset.value}`)
            console.log("Voor:", btn.dataset.value);
            // if (!btn.dataset.value) {
            //     btn.dataset.value = true;
            // } else {
            //     btn.dataset.value = false;
            // }
            console.log("Na:", btn.dataset.value);
            // console.log(newValue)
            // btn.dataset.value = newValue
            console.log(btn)
            console.log(btn.dataset)
        }

        if (deviceID == 7){
            console.log("2")
            const url = `${lanIP}/actuator/`;
            const body = JSON.stringify({ deviceID: 7, value: btn.dataset.value });
            console.log(body)
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            }).catch((err) => console.error('Fetch-error:', err));
            const json = await response.json().catch((err) => console.error('JSON-error:', err));
            // console.log(btn.dataset.value)
            // console.log(!btn.dataset.value)
            // let newValue;
            // if (btn.dataset.value == "true"){
            //     newValue = "false"
            // }
            // else {
            //     newValue = "true"
            // }
            // console.log(newValue)
            // btn.dataset.value = newValue
        }

    })

    setTimeout(() => {
        feedbackField.classList.add("c--hidden");
    }, 5000);


    }
    
    }

const listenToExtraButtons = async () => {
    const verkeerdeWaardeKnop = document.querySelector(".js-verkeerde-waarde-knop");
    const shutdownKnop = document.querySelector(".js-shutdown-knop");
    const feedback_container = document.querySelector(".js-feedback-containter");
    feedback_container.innerHTML = "";

    verkeerdeWaardeKnop.addEventListener("click", async() => {
        console.log("verkeerde waarde knop ingedrukt");

        feedback_container.innerHTML = `<div class="js-buttons-feedback c-change_feedback">&#x23F3; Wordt geregistreerd...</div>`;

        const url = `${lanIP}/fault/`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // body: body
        }).catch((err) => console.error('Fetch-error:', err));
        const json = await response.json().catch((err) => console.error('JSON-error:', err));

        

        if (json){
            console.log("verkeerde waarde geregistreerd");
            feedback_container.innerHTML = `<div class="js-buttons-feedback c-change_feedback u--success">&#10004; Gewichtsensor gekalibreerd</div>`;
        }
        else{
            feedback_container.innerHTML = `<div class="js-buttons-feedback c-change_feedback u--error">&#10006; Fout: niet gekalibreerd</div>`;
        }
        setTimeout(() => {
            feedback_container.innerHTML = "";
        }, 5000);
    });

    shutdownKnop.addEventListener("click", async() => {
        console.log("shutdown button pressed");
        const password = prompt("Geef het shutdown-wachtwoord a.u.b. :");

        if (password === null || password === "") {
            // Gebruiker annuleerde
            return;
        }
        else {
            const url = `${lanIP}/shutdown/`;
            const body = JSON.stringify({ password: password });
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            }).catch((err) => console.error('Fetch-error:', err));
            const json = await response.json().catch((err) => console.error('JSON-error:', err));

            if (json && json.msg && json.msg.includes("power off")) {
                feedback_container.innerHTML = `<div class="js-buttons-feedback c-change_feedback u--success">&#10004; Pi wordt afgesloten</div>`;
            } 
            else {
                feedback_container.innerHTML = `<div class="js-buttons-feedback c-change_feedback u--error">&#10006; Fout wachtwoord</div>`;
                // alert("Verkeerd!");
            }
            setTimeout(() => {
                feedback_container.innerHTML = "";
            }, 5000);
        }


        


    })


}



const listenToSocket = async () => {
    console.log("listenToSocket");

    socketio.on('connect', (msg) => {
        console.log('Verbonden met socketio-server');
    });

    socketio.on("B2F_new_sensorwaarde", async (msg) => {
        // if (homepage || infopage){
        //     console.log(`B2F_new_sensorwaarde ${msg}`)
        const deviceID = msg["DeviceID"];
        // const waarde = msg["waarde"];

            // const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
            // // console.log(deviceID)
            // let outputString = `${waarde}`
            
            if (deviceID == 1){
                // lock
                if (homepage){
                    console.log("lock!")
                    const waarde = msg["waarde"];
                    const unlockButton = document.querySelector(".js-lock-button")
                    const buttonTekst = document.querySelector(".js-lock-button__text");
                    const openIcon = document.querySelector(".js-lock_open");
                    const closedIcon = document.querySelector(".js-lock_closed");
                    // console.log(openIcon);
                    // console.log(closedIcon);
                    // console.log(waarde);
                    if (waarde){
                        isLockOpen = true;
                        unlockButton.title = "sluit slot"
                        openIcon.classList.remove("c--hidden");
                        closedIcon.classList.add("c--hidden");
                        buttonTekst.innerHTML = "Sluit slot"
                        showLaatsteLeging()
                    }
                    else {
                        isLockOpen = false;
                        unlockButton.title = "open slot"
                        openIcon.classList.add("c--hidden");
                        closedIcon.classList.remove("c--hidden");
                        buttonTekst.innerHTML = "Open slot"
                    }

                }  
                
            }

            if (deviceID == 2){
                // flag
                if (homepage || infopage){
                    const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                    const waarde = msg["waarde"];
                    // console.log(deviceID)
                    if (waarde){
                        aanTePassen.innerHTML = "Op";
                    }
                    else {
                        aanTePassen.innerHTML = "Neer";
                    }
                }
                
                
            }

            if (deviceID == 3){
                // RFID / users
                if (homepage || infopage){
                    const aanTePassen = document.querySelector(".js-last-user");
                    const data = await getLastUserNoShow();
                    console.log(data);
                    // data = {username: 'user1', datum_en_tijd: '2025-06-10T10:08:33'}
                    const username = data["username"];
                    const tijd = data["datum_en_tijd"].substr(11, 5);

                    let outputString = `<p class="c-info__regular_text">Last user</p>
                            <p class="c-info__bold_text js-lastuser-name">${username}</p>
                            <p class="c-info__regular_text js-lastuser-time">${tijd}</p>`;
                    aanTePassen.innerHTML = outputString;
                }
                
                if (infopage && keuzemenuPagina == 3){
                    showInfoDevice(3);
                }

            }

            if (deviceID == 4){
                // gewicht
                const waarde = msg["waarde"];
                
                if (homepage){
                    const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                    // console.log(deviceID)
                    let outputString = `${waarde}`
                    outputString += `g`
                    aanTePassen.innerHTML = outputString;
                    showLaatsteLevering();

                }
                // console.log(`KeuzemenuPagina: ${keuzemenuPagina}`);
                // console.log(infopage);
                if (infopage){
                    console.log("show new info")
                    const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                    // console.log(deviceID)
                    let outputString = `${waarde}`
                    outputString += `g`
                    aanTePassen.innerHTML = outputString;
                    if (keuzemenuPagina == 4){
                        showInfoDevice(4);
                    }
                }

                if (settingspage && keuzemenuPagina == 4){
                    
                    // <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceid="4" data-kind="trigger">-13.65g</div>
                    const url = `${lanIP}/historiek_device_limit/4/1`;
                    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
                    const json = await response.json().catch((err) => console.error('JSON-error:', err));

                    // console.log(document.querySelector(".js-datavalue[data-deviceID='4'][data-kind='trigger']"))
                    document.querySelector(".js-datavalue[data-deviceID='4'][data-kind='trigger']").innerHTML = json[0]["waarde"] + "g"
                }
            }

            if (deviceID == 5){
                // klep (reed)
                const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                const waarde = msg["waarde"];
                if (waarde){
                    aanTePassen.innerHTML = "Open"
                }
                else {
                    aanTePassen.innerHTML = "Dicht"
                }
                if (infopage && keuzemenuPagina == 5){
                    // console.log("show new info")
                    showInfoDevice(5);
                }
                
            }

            if (deviceID == 6){
                // LDR
                if (homepage || infopage){
                    const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                    const waarde = msg["waarde"];
                    // console.log(deviceID)
                    let outputString = `${waarde}`
                    outputString += `%`
                    aanTePassen.innerHTML = outputString;

                    if (infopage && keuzemenuPagina == 6){
                        // console.log("show new info")
                        showInfoDevice(6);
                    }
                }

                if (settingspage && keuzemenuPagina == 6){

                    
                    // <div class="c-changer__current_value js-current-value js-lichtvalue js-datavalue" data-deviceid="4" data-kind="trigger">-13.65g</div>
                    const url = `${lanIP}/historiek_device_limit/6/1`;
                    const response = await fetch(url).catch((err) => console.error('Fetch-error:', err));
                    const json = await response.json().catch((err) => console.error('JSON-error:', err));
                    // console.log(json)

                    // console.log(document.querySelector(".js-datavalue[data-deviceID='4'][data-kind='trigger']"))
                    document.querySelector(".js-datavalue[data-deviceID='6'][data-kind='trigger']").innerHTML = json[0]["waarde"] + "%"
                }
                

            }

            if (deviceID == 7){
                // LED
                if (homepage || infopage){
                    const aanTePassen = document.querySelector(`.js-datavalue[data-deviceID="${deviceID}"]`);
                    const waarde = msg["waarde"];
                    if (waarde){
                        aanTePassen.innerHTML = "Aan"
                    }
                    else {
                        aanTePassen.innerHTML = "Uit"
                    }
                }
                

                
            }

            if (deviceID == 8){  
            }



            


       
    })

    socketio.on("B2F_post_change", async (isPost) => {
        if (homepage){
            showIfPost(isPost);

        }
    })

    socketio.on("B2F_lock_change", async (msg) => {
        if (homepage){
            getLockStatus();
        }
    })

    socketio.on("B2F_delaytime_change", async (msg) => {
        console.log("B2F_delaytime")
        if (settingspage){

            let deviceID = msg["deviceID"];
            
            console.log(deviceID);
            const delaytime = msg["delaytime"];
            const aanTePassen = document.querySelector(`.js-current-value[data-deviceID='${deviceID}']`)
            aanTePassen.innerHTML = delaytime + "s"

            const valueField = document.querySelector(`.js-changer-value[data-deviceID='${deviceID}']`);
            console.log(valueField);
            valueField.value = delaytime;

            

        }
        
    })

    socketio.on("B2F_triggerwaarde_change", async (msg) => {
        if (settingspage){

            let deviceID = msg["deviceID"];
            
            console.log(deviceID);
            const triggerwaarde = msg["triggerwaarde"];
            // console.log(triggerwaarde)

            const valueField = document.querySelector(`.js-changer-value[data-deviceID='${deviceID}'][data-kind='trigger']`);
            // console.log(valueField);
            valueField.value = triggerwaarde;

            

        }




    })

    socketio.on("B2F_actuator_change", async (msg) => {
        console.log(msg);
        console.log(keuzemenuPagina);
        const deviceID = msg["deviceID"];
        const waarde = msg["value"];
        if (settingspage){
            if (keuzemenuPagina == deviceID){
                const aanTePassenButton = document.querySelector(".js-changer-button")
                const aanTePassenText = aanTePassenButton.querySelector(".js-button-text");
                if (keuzemenuPagina == 2){
                    // aanTePassen.dataset.value = !waarde;
                    if (waarde){
                        aanTePassenText.innerHTML = "Vlag neer";
                        aanTePassenButton.dataset.value = false;
                    }
                    else {
                        aanTePassenText.innerHTML = "Vlag op";
                        aanTePassenButton.dataset.value = true;
                    }
                }
                if (keuzemenuPagina == 7){
                    // console.log(aanTePassen);
                    // aanTePassen.dataset.value = !waarde;
                    if (waarde){
                        aanTePassenText.innerHTML = "LED OFF";
                        aanTePassenButton.dataset.value = false;
                    }
                    else {
                        aanTePassenText.innerHTML = "LED ON";
                        aanTePassenButton.dataset.value = true;
                    }
                }
                
            }
                

        }
        
    })


}
// #endregion

// #region ***  Init / DOMContentLoaded                  ***********
const init = () => {
    homepage = document.querySelector(".c-homepage");
    if (homepage){
        console.log("index pagina");
        loadOverview();
        getDevices();
        getIsPost();
        showLaatsteLeging();
        showLaatsteLevering();
        listenToSocket();
        getLockStatus();
        listenToUnlockbutton();
        
    }

    infopage = document.querySelector(".c-infopage");
    if (infopage){
        console.log("info page");
        loadOverview();
        getDevices();
        listenToMenu();
        listenToSocket();
    }

    settingspage = document.querySelector(".c-settingspage");
    if (settingspage){
        console.log("settingspage");
        listenToMenu();
        listenToExtraButtons();
        listenToSocket();
    }


    
}

document.addEventListener("DOMContentLoaded", init);

// #endregion
