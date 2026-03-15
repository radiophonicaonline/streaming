let audioContext;
let analyser;
let microphone;
let stream;

async function getDevices(){

const devices = await navigator.mediaDevices.enumerateDevices();

const select = document.getElementById("audioSource");

devices.forEach(device=>{

if(device.kind === "audioinput"){

const option = document.createElement("option");

option.value=device.deviceId;
option.text=device.label || "Audio device";

select.appendChild(option);

}

});

}

getDevices();

async function startStream(){

const deviceId = document.getElementById("audioSource").value;

stream = await navigator.mediaDevices.getUserMedia({
audio:{deviceId:deviceId}
});

audioContext = new AudioContext();

microphone = audioContext.createMediaStreamSource(stream);

analyser = audioContext.createAnalyser();

microphone.connect(analyser);

visualize();

document.getElementById("status").innerText="Estado: TRANSMITIENDO";

}

function stopStream(){

if(stream){
stream.getTracks().forEach(track=>track.stop());
}

document.getElementById("status").innerText="Estado: OFFLINE";

}

function visualize(){

const meter=document.getElementById("meter");

const dataArray=new Uint8Array(analyser.frequencyBinCount);

function draw(){

analyser.getByteFrequencyData(dataArray);

let values=0;

for(let i=0;i<dataArray.length;i++){
values+=dataArray[i];
}

let average=values/dataArray.length;

meter.style.width=(average)+"%";

requestAnimationFrame(draw);

}

draw();

}
