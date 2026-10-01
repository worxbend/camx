#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <esp_arduino_version.h>
#include "motion.h"
#include "settings.h"

WebServer server(80);
Preferences prefs;
Axis axes[2];
bool armed=false, stopped=true;
uint32_t lastTick=0, lastCommand=0;
String serialLine;
bool serialOverflow=false;
const int pins[2]={PAN_PIN,TILT_PIN};

void duty(int axis,int pulse) {
  const uint32_t value=pulse ? (uint32_t(pulse)*65535UL+10000UL)/20000UL : 0;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pins[axis],value);
#else
  ledcWrite(axis,value);
#endif
}
void halt() {for(auto &a:axes)a.stop(); stopped=true;}
void disarm() {halt();armed=false;duty(0,0);duty(1,0);}
bool arm() {
  if(digitalRead(STOP_PIN)==LOW)return false;
  // PWM assumes center on first enable; SG90 has no position feedback.
  if(!armed)for(auto &a:axes){a.current=0;a.target=0;}
  armed=true;stopped=false;lastCommand=millis();return true;
}
bool move(float pan,float tilt) {
  if(!armed || stopped || !std::isfinite(pan) || !std::isfinite(tilt))return false;
  for(int i=0;i<2;++i){float v=i?tilt:pan;if(v<axes[i].config.minimum || v>axes[i].config.maximum)return false;}
  axes[0].target=pan;axes[1].target=tilt;lastCommand=millis();return true;
}
String status() {
  char out[620];
  snprintf(out,sizeof(out),"{\"armed\":%s,\"stopped\":%s,\"estop\":%s,\"pan\":%.2f,\"tilt\":%.2f,\"pan_target\":%.2f,\"tilt_target\":%.2f,\"pan_min\":%.1f,\"pan_max\":%.1f,\"tilt_min\":%.1f,\"tilt_max\":%.1f,\"pan_center\":%d,\"tilt_center\":%d}",
    armed?"true":"false",stopped?"true":"false",digitalRead(STOP_PIN)==LOW?"true":"false",
    axes[0].current,axes[1].current,axes[0].target,axes[1].target,
    axes[0].config.minimum,axes[0].config.maximum,axes[1].config.minimum,axes[1].config.maximum,
    axes[0].config.center,axes[1].config.center);
  return out;
}
bool number(const String &s,float &value) {
  if(s.length()==0 || s.length()>24)return false;
  char *end;value=strtof(s.c_str(),&end);
  return end!=s.c_str() && *end=='\0' && std::isfinite(value);
}
void loadConfig(){
  prefs.begin("camx",true);
  for(int i=0;i<2;i++){
    String key=i?"tilt":"pan";
    AxisConfig c=axes[i].config;
    // Field-wise storage avoids struct padding/version dependencies.
    if(prefs.getUInt("version",0)==1){
      c.center=prefs.getInt((key+"c").c_str(),c.center);
      c.low=prefs.getInt((key+"l").c_str(),c.low);c.high=prefs.getInt((key+"h").c_str(),c.high);
      c.minimum=prefs.getFloat((key+"n").c_str(),c.minimum);c.maximum=prefs.getFloat((key+"x").c_str(),c.maximum);
      c.speed=prefs.getFloat((key+"s").c_str(),c.speed);c.invert=prefs.getBool((key+"i").c_str(),c.invert);
    }
    if(c.valid())axes[i].config=c;
  }prefs.end();
}
bool calibrate(int axis,const AxisConfig &c){
  if(armed || axis<0 || axis>1 || !c.valid())return false;
  axes[axis].config=c;
  prefs.begin("camx",false);String k=axis?"tilt":"pan";
  prefs.putUInt("version",1);prefs.putInt((k+"c").c_str(),c.center);
  prefs.putInt((k+"l").c_str(),c.low);prefs.putInt((k+"h").c_str(),c.high);
  prefs.putFloat((k+"n").c_str(),c.minimum);prefs.putFloat((k+"x").c_str(),c.maximum);
  prefs.putFloat((k+"s").c_str(),c.speed);prefs.putBool((k+"i").c_str(),c.invert);prefs.end();return true;
}
const char PAGE[] PROGMEM=R"HTML(<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAMX</title><style>body{font:18px system-ui;background:#17222c;color:#f1f6fa;max-width:650px;margin:30px auto;padding:20px}button{padding:14px;margin:6px;border:0;border-radius:8px;cursor:pointer}input{width:100%;margin:20px 0}#stop{background:#ff6565}pre{white-space:pre-wrap}label{display:block}small{color:#b8cad5}</style><h1>CAMX pan &amp; tilt</h1><p>Connect the servo supply and check cable slack before arming.</p><button id="arm">Arm / resume</button><button id="home">Home</button><button id="stop">STOP · hold</button><button id="off">Disable PWM</button><label>Pan <output id="pv">0</output>°<input id="pan" type="range" min="-60" max="60" value="0" step="1"></label><label>Tilt <output id="tv">0</output>°<input id="tilt" type="range" min="-25" max="25" value="0" step="1"></label><p id="state" role="status"></p><small>Disable PWM releases holding torque. Support the camera first. Position values are commanded estimates.</small><details><summary>Calibration (PWM disabled)</summary><p>Serial command: CAL axis center low high min max invert speed. See the assembly guide.</p></details><script>
const $=id=>document.getElementById(id);let ready=false,pending=false;
async function post(path,body=''){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)throw Error(await r.text());return r.json()}
async function action(path){try{await post(path);await refresh()}catch(e){$('state').textContent=e.message}}
$('arm').onclick=()=>action('/arm');$('home').onclick=()=>action('/home');$('stop').onclick=()=>action('/stop');$('off').onclick=()=>action('/disarm');
async function send(){if(!pending)return;pending=false;try{await post('/move',new URLSearchParams({pan:$('pan').value,tilt:$('tilt').value}))}catch(e){$('state').textContent=e.message}}
for(const id of ['pan','tilt'])$(id).oninput=()=>{$('pv').value=$('pan').value;$('tv').value=$('tilt').value;pending=true};setInterval(send,100);
async function refresh(){try{const s=await(await fetch('/status')).json();$('state').textContent=s.estop?'Hardware STOP pressed':!s.armed?'PWM disabled':s.stopped?'Stopped · Arm to resume':'Armed';for(const a of ['pan','tilt']){$(a).min=s[a+'_min'];$(a).max=s[a+'_max'];if(!ready)$(a).value=s[a+'_target'];$(a).disabled=!s.armed||s.stopped}ready=true;$('pv').value=$('pan').value;$('tv').value=$('tilt').value}catch(e){$('state').textContent='Connection lost'}}setInterval(refresh,1000);refresh();
</script></html>)HTML";
void reply(bool ok){server.send(ok?200:409,"application/json",ok?status():"{\"error\":\"Rejected: check arm state, stop switch, numbers and limits\"}");}
void setupWeb(){
 server.on("/",HTTP_GET,[]{server.send_P(200,"text/html",PAGE);});
 server.on("/status",HTTP_GET,[]{server.send(200,"application/json",status());});
 server.on("/arm",HTTP_POST,[]{reply(arm());});server.on("/stop",HTTP_POST,[]{halt();reply(true);});
 server.on("/disarm",HTTP_POST,[]{disarm();reply(true);});server.on("/home",HTTP_POST,[]{reply(move(0,0));});
 server.on("/move",HTTP_POST,[]{float p,t;reply(number(server.arg("pan"),p)&&number(server.arg("tilt"),t)&&move(p,t));});
 server.onNotFound([]{server.send(404,"text/plain","Not found");});server.begin();
}
void command(String line){
 line.trim();bool ok=false;
 if(line=="STATUS"){Serial.println(status());return;}
 if(line=="ARM")ok=arm();else if(line=="STOP"){halt();ok=true;}
 else if(line=="DISARM"){disarm();ok=true;}else if(line=="HOME")ok=move(0,0);
 else if(line.startsWith("MOVE ")){
   int space=line.indexOf(' ',5);float p,t;
   if(space>5)ok=number(line.substring(5,space),p)&&number(line.substring(space+1),t)&&move(p,t);
 }else if(line.startsWith("CAL ")){
   // Require exactly nine fields; reject trailing junk and fractional integer fields.
   float fields[8];int start=4;bool parsed=true;
   for(int i=0;i<8;i++){int end=line.indexOf(' ',start);if(i==7)end=line.length();if(end<0 || !number(line.substring(start,end),fields[i])){parsed=false;break;}start=end+1;}
   if(parsed && start==int(line.length())+1 && fields[0]>=0 && fields[0]<=1 && fields[0]==floorf(fields[0]) && fields[1]==floorf(fields[1]) && fields[2]==floorf(fields[2]) && fields[3]==floorf(fields[3]) && fields[1]>=700 && fields[1]<=2300 && fields[2]>=700 && fields[2]<=2300 && fields[3]>=700 && fields[3]<=2300 && (fields[6]==0 || fields[6]==1)){
     AxisConfig c;c.center=int(fields[1]);c.low=int(fields[2]);c.high=int(fields[3]);c.minimum=fields[4];c.maximum=fields[5];c.invert=fields[6];c.speed=fields[7];ok=calibrate(int(fields[0]),c);
   }
 }
 if(ok)Serial.println(status());else Serial.println("ERR rejected; STATUS, ARM, STOP, DISARM, HOME, MOVE pan tilt, CAL axis center low high min max invert speed");
}
void setup(){
 Serial.begin(115200);pinMode(STOP_PIN,INPUT_PULLUP);
 axes[1].config.minimum=-25;axes[1].config.maximum=25;axes[1].config.speed=15;
 loadConfig();
 for(int i=0;i<2;i++){
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  if(!ledcAttach(pins[i],50,16)){Serial.println("PWM init failed");while(true)delay(1000);}
#else
  ledcSetup(i,50,16);ledcAttachPin(pins[i],i);
#endif
  duty(i,0);
 }
 WiFi.mode(WIFI_AP);WiFi.softAP(AP_NAME,AP_PASSWORD,1,false,1);setupWeb();
 Serial.println("CAMX ready, PWM DISABLED. AP at http://192.168.4.1");lastTick=millis();
}
void loop(){
 // Check before network/serial handling; a pressed switch latches STOP, keeping torque.
 if(digitalRead(STOP_PIN)==LOW)halt();
 server.handleClient();
 for(int count=0;count<64 && Serial.available();count++){
  char c=Serial.read();if(c=='\r')continue;
  if(c=='\n'){if(serialOverflow)Serial.println("ERR line too long");else command(serialLine);serialLine="";serialOverflow=false;}
  else if(serialLine.length()<160 && !serialOverflow)serialLine+=c;
  else {serialOverflow=true;serialLine="";}
 }
 uint32_t now=millis();if(armed && !stopped && uint32_t(now-lastCommand)>COMMAND_TIMEOUT_MS)halt();
 if(uint32_t(now-lastTick)>=20){float dt=uint32_t(now-lastTick)/1000.0f;lastTick=now;
   if(digitalRead(STOP_PIN)==LOW)halt();
   if(armed)for(int i=0;i<2;i++){axes[i].tick(dt);duty(i,pulseFor(axes[i].current,axes[i].config));}
 }delay(1);
}
