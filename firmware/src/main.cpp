#include <Arduino.h>
#include <esp_system.h>
#include <atomic>
#include <WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "http_request.h"
#include "motion_planner.h"
#include "jog_lease.h"
#include "connection_pause.h"
#include <freertos/semphr.h>
#include <Preferences.h>
#include <esp_arduino_version.h>
#include "motion.h"
#include "settings.h"
// Serial and HTTP commands can calculate trajectories; give both task stacks
// extra headroom for the fixed-size solver's nested numerical routines.
SET_LOOP_TASK_STACK_SIZE(16384);
#if __has_include("credentials.h")
#include "credentials.h"
#else
constexpr char WIFI_SSID[]="", WIFI_PASSWORD[]="", API_TOKEN[]="";
#endif

WiFiServer server(80);
SemaphoreHandle_t motionMutex;
struct Guard { Guard(){xSemaphoreTakeRecursive(motionMutex,portMAX_DELAY);} ~Guard(){xSemaphoreGiveRecursive(motionMutex);} };
bool networkWasConnected=false;
bool filesystemReady=false;
std::atomic<bool> networkLost{false};
uint32_t lastReconnect=0;
Preferences prefs;
Axis axes[2];
bool armed=false, stopped=true;
bool connectionPaused=false;
uint32_t lastTick=0, lastCommand=0;
String serialLine;
bool serialOverflow=false;
const int pins[2]={PAN_PIN,TILT_PIN};

void duty(int axis,double pulse) {
  const uint32_t value=servoDutyFor(pulse);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pins[axis],value);
#else
  ledcWrite(axis,value);
#endif
}
MotionPlanner planner;
JogLease jogLease;
void connectionHold(){Guard guard;pauseConnection(planner,axes,jogLease,connectionPaused);}
void halt() {Guard guard;if(!stopped||jogLease.active)jogLease.invalidate();planner.stop(axes); stopped=true;}
void disarm() {Guard guard;jogLease.invalidate();planner.stop(axes);stopped=true;armed=false;duty(0,0);duty(1,0);}
bool arm() {
  Guard guard;
  if(digitalRead(STOP_PIN)==LOW)return false;
  // PWM assumes center on first enable; SG90 has no position feedback.
  if(!armed){for(auto &a:axes){a.current=0;a.target=0;}planner.stop(axes);}
  planner.stop(axes);jogLease.invalidate();armed=true;stopped=false;connectionPaused=false;lastCommand=millis();return true;
}
bool move(float pan,float tilt) {
  Guard guard;
  if(digitalRead(STOP_PIN)==LOW){halt();return false;}
  if(jogLease.expired(millis())){connectionHold();return false;}
  if(!armed || stopped || !std::isfinite(pan) || !std::isfinite(tilt))return false;
  if(!planner.plan(axes,pan,tilt))return false;
  if(digitalRead(STOP_PIN)==LOW){halt();return false;}
  if(jogLease.expired(millis())){connectionHold();return false;}
  jogLease.invalidate();connectionPaused=false;lastCommand=millis();return true;
}
bool jog(double pan,double tilt,uint32_t epoch,uint32_t seq){
  Guard guard;
  if(digitalRead(STOP_PIN)==LOW){halt();return false;}
  if(jogLease.expired(millis())){connectionHold();return false;}
  if(!jogLease.accepts(pan,tilt,epoch,seq,armed,stopped,false))return false;
  if(!planner.jog(axes,pan,tilt))return false;
  if(digitalRead(STOP_PIN)==LOW){halt();return false;}
  if(jogLease.expired(millis())){connectionHold();return false;}
  jogLease.accept(pan,tilt,seq,millis());connectionPaused=false;lastCommand=millis();return true;
}
String status() {
  Guard guard;
  char out[1280];
  snprintf(out,sizeof(out),"{\"armed\":%s,\"stopped\":%s,\"estop\":%s,\"pan\":%.2f,\"tilt\":%.2f,\"pan_target\":%.2f,\"tilt_target\":%.2f,\"pan_min\":%.1f,\"pan_max\":%.1f,\"tilt_min\":%.1f,\"tilt_max\":%.1f,\"pan_center\":%d,\"tilt_center\":%d,\"pan_low\":%d,\"pan_high\":%d,\"tilt_low\":%d,\"tilt_high\":%d,\"pan_speed\":%.1f,\"tilt_speed\":%.1f,\"pan_invert\":%s,\"tilt_invert\":%s,\"firmware\":\"0.5.2\",\"control_epoch\":%u,\"jog_seq\":%u,\"jog_pan\":%.3f,\"jog_tilt\":%.3f,\"jog_active\":%s,\"jog_lease_ms\":500,\"connection_paused\":%s}",
    armed?"true":"false",stopped?"true":"false",digitalRead(STOP_PIN)==LOW?"true":"false",
    axes[0].current,axes[1].current,axes[0].target,axes[1].target,
    axes[0].config.minimum,axes[0].config.maximum,axes[1].config.minimum,axes[1].config.maximum,
    axes[0].config.center,axes[1].config.center,
    axes[0].config.low,axes[0].config.high,axes[1].config.low,axes[1].config.high,
    axes[0].config.speed,axes[1].config.speed,axes[0].config.invert?"true":"false",axes[1].config.invert?"true":"false",unsigned(jogLease.epoch),unsigned(jogLease.sequence),jogLease.pan,jogLease.tilt,jogLease.active?"true":"false",connectionPaused?"true":"false");
  return out;
}
bool number(const String &s,float &value) {
  if(s.length()==0 || s.length()>24)return false;
  char *end;value=strtof(s.c_str(),&end);
  return end!=s.c_str() && *end=='\0' && std::isfinite(value);
}
// One NVS blob per axis makes a complete calibration update atomic. The fixed
// record layout is independent of AxisConfig compiler padding; legacy keys load.
struct __attribute__((packed)) SavedCalibration {
 uint32_t version;int32_t center,low,high;float minimum,maximum,speed;uint8_t invert;
};
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
    const char *blobKey=i?"tilt2":"pan2";
    SavedCalibration saved{};
    if(prefs.getBytesLength(blobKey)==sizeof(saved) && prefs.getBytes(blobKey,&saved,sizeof(saved))==sizeof(saved) && saved.version==2 && saved.invert<=1){
      AxisConfig candidate;candidate.center=saved.center;candidate.low=saved.low;candidate.high=saved.high;
      candidate.minimum=saved.minimum;candidate.maximum=saved.maximum;candidate.speed=saved.speed;candidate.invert=saved.invert;
      if(axisConfigSafe(i,candidate))c=candidate;
    }
    if(axisConfigSafe(i,c))axes[i].config=c;
  }prefs.end();
}
bool calibrate(int axis,const AxisConfig &c){
  Guard guard;
  if(armed || !axisConfigSafe(axis,c))return false;
  if(!prefs.begin("camx",false))return false;
  const SavedCalibration saved{2,c.center,c.low,c.high,c.minimum,c.maximum,c.speed,uint8_t(c.invert)};
  bool savedOk=prefs.putBytes(axis?"tilt2":"pan2",&saved,sizeof(saved))==sizeof(saved);
  prefs.end();if(!savedOk)return false;
  planner.stop(axes);axes[axis].config=c;axes[axis].current=0;axes[axis].target=0;return true;
}
const char PAGE[] PROGMEM=R"HTML(<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CAMX</title><style>body{font:18px system-ui;background:#17222c;color:#f1f6fa;max-width:650px;margin:30px auto;padding:20px}button{padding:14px;margin:6px;border:0;border-radius:8px;cursor:pointer}input{width:100%;margin:20px 0}#stop{background:#ff6565}pre{white-space:pre-wrap}label{display:block}small{color:#b8cad5}</style><h1>CAMX pan &amp; tilt</h1><p><a href="/control/" style="color:#81eed0">Open full CAMX control studio</a> (requires uploaded filesystem)</p><p>Connect the servo supply and check cable slack before arming.</p><button id="arm">Arm / resume</button><button id="home">Home</button><button id="stop">STOP · hold</button><button id="off">Disable PWM</button><label>Pan <output id="pv">0</output>°<input id="pan" type="range" min="-60" max="60" value="0" step="1"></label><label>Tilt <output id="tv">0</output>°<input id="tilt" type="range" min="-25" max="25" value="0" step="1"></label><label>API token (if configured)<input id="token" type="password" autocomplete="off"></label><p id="state" role="status"></p><small>Disable PWM releases holding torque. Support the camera first. Position values are commanded estimates.</small><details><summary>Calibration (PWM disabled)</summary><p>Serial command: CAL axis center low high min max invert speed. See the assembly guide.</p></details><script>
const $=id=>document.getElementById(id);let ready=false,pending=false,sending=false;
async function post(path,body=''){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-CAMX-Request':'1',...($('token').value?{'Authorization':'Bearer '+$('token').value}:{})},body});if(!r.ok)throw Error(await r.text());return r.json()}
async function action(path){pending=false;try{await post(path);await refresh()}catch(e){$('state').textContent=e.message}}
$('arm').onclick=()=>action('/arm');$('home').onclick=()=>action('/home');$('stop').onclick=()=>action('/stop');$('off').onclick=()=>action('/disarm');
async function send(){if(!pending||sending)return;pending=false;sending=true;try{await post('/move',JSON.stringify({pan:Number($('pan').value),tilt:Number($('tilt').value)}))}catch(e){pending=false;$('state').textContent=e.message}finally{sending=false}}
for(const id of ['pan','tilt'])$(id).oninput=()=>{$('pv').value=$('pan').value;$('tv').value=$('tilt').value;pending=true};setInterval(send,100);
async function refresh(){try{const s=await(await fetch('/status')).json();$('state').textContent=s.estop?'Hardware STOP pressed':!s.armed?'PWM disabled':s.stopped?'Stopped · Arm to resume':'Armed';for(const a of ['pan','tilt']){$(a).min=s[a+'_min'];$(a).max=s[a+'_max'];if(!ready||(!pending&&!sending))$(a).value=s[a+'_target'];$(a).disabled=!s.armed||s.stopped}ready=true;$('pv').value=$('pan').value;$('tv').value=$('tilt').value}catch(e){$('state').textContent='Connection lost'}}setInterval(refresh,1000);refresh();
</script></html>)HTML";
void response(WiFiClient &client,int code,const char *body,const char *type="application/json") {
  const char *reason=code==200?"OK":code==400?"Bad Request":code==401?"Unauthorized":code==404?"Not Found":code==405?"Method Not Allowed":code==409?"Conflict":code==413?"Payload Too Large":code==415?"Unsupported Media Type":"Rejected";
  client.printf("HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %u\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n\r\n",code,reason,type,unsigned(strlen(body)));
  client.print(body);
}
bool serveControl(WiFiClient &client,const char *path){
  if(!safeControlPath(path))return false;
  if(!filesystemReady){response(client,404,"{\"error\":\"client filesystem not uploaded\"}");return true;}
  String filePath=!strcmp(path,"/control/")?"/control/index.html":path;
  File file=LittleFS.open(filePath,"r");
  if(!file || file.isDirectory()){response(client,404,"{\"error\":\"not_found\"}");return true;}
  const char *type=filePath.endsWith(".html")?"text/html; charset=utf-8":filePath.endsWith(".js")?"text/javascript; charset=utf-8":filePath.endsWith(".css")?"text/css; charset=utf-8":filePath.endsWith(".svg")?"image/svg+xml":filePath.endsWith(".png")?"image/png":filePath.endsWith(".woff2")?"font/woff2":"application/octet-stream";
  client.printf("HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %u\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\n\r\n",type,unsigned(file.size()));
  uint8_t buffer[1024];uint32_t started=millis();
  while(file.available() && client.connected() && uint32_t(millis()-started)<5000){
    size_t count=file.read(buffer,sizeof(buffer)),sent=0;
    while(sent<count && client.connected() && uint32_t(millis()-started)<5000){
      size_t written=client.write(buffer+sent,count-sent);if(!written){vTaskDelay(pdMS_TO_TICKS(1));continue;}sent+=written;
    }
    vTaskDelay(pdMS_TO_TICKS(1));
  }
  file.close();return true;
}
void route(WiFiClient &client,const HttpRequest &r) {
  if(!strcmp(r.method,"GET")) {
    if(serveControl(client,r.path))return;
    if(!strcmp(r.path,"/")){response(client,200,PAGE,"text/html; charset=utf-8");return;}
    if(!strcmp(r.path,"/status")){response(client,200,status().c_str());return;}
    response(client,404,"{\"error\":\"not_found\"}");return;
  }
  if(strcmp(r.method,"POST")){response(client,405,"{\"error\":\"method_not_allowed\"}");return;}
  // Custom header prevents cross-origin HTML form requests; no CORS is exposed.
  if(strcmp(r.intent,"1")){response(client,400,"{\"error\":\"X-CAMX-Request: 1 required\"}");return;}
  if(API_TOKEN[0] && String(r.authorization)!=String("Bearer ")+API_TOKEN){response(client,401,"{\"error\":\"unauthorized\"}");return;}
  bool ok=false;
  if(!strcmp(r.path,"/move")){
    if(strcmp(r.contentType,"application/json")){response(client,415,"{\"error\":\"application/json required\"}");return;}
    float pan,tilt;
    if(!parseMove(r.body,pan,tilt)){response(client,400,"{\"error\":\"expected numeric pan and tilt only\"}");return;}
    ok=move(pan,tilt);
  }else if(!strcmp(r.path,"/jog")){
    if(strcmp(r.contentType,"application/json")){response(client,415,"{\"error\":\"application/json required\"}");return;}
    double pan,tilt;uint32_t epoch,seq;
    if(!parseJog(r.body,pan,tilt,epoch,seq)){response(client,400,"{\"error\":\"expected normalized pan/tilt and uint32 epoch/seq\"}");return;}
    ok=jog(pan,tilt,epoch,seq);
  }else if(!strcmp(r.path,"/calibration")){
    if(strcmp(r.contentType,"application/json")){response(client,415,"{\"error\":\"application/json required\"}");return;}
    int axis;AxisConfig config;
    if(!parseCalibration(r.body,axis,config)){response(client,400,"{\"error\":\"invalid calibration schema or limits\"}");return;}
    ok=calibrate(axis,config);
  }else{
    if(r.body[0]){response(client,400,"{\"error\":\"action body must be empty\"}");return;}
    if(!strcmp(r.path,"/arm"))ok=arm();
    else if(!strcmp(r.path,"/stop")){halt();ok=true;}
    else if(!strcmp(r.path,"/disarm")){disarm();ok=true;}
    else if(!strcmp(r.path,"/home"))ok=move(0,0);
    else if(!strcmp(r.path,"/heartbeat")){
      Guard guard;if(jogLease.expired(millis()))connectionHold();ok=controlLeaseAllowed(armed,stopped,digitalRead(STOP_PIN)==LOW);
      if(ok)lastCommand=millis();
    }
    else{response(client,404,"{\"error\":\"not_found\"}");return;}
  }
  response(client,ok?200:409,ok?status().c_str():"{\"error\":\"motion rejected: check arm, stop and limits\"}");
}
void httpTask(void*) {
  // Fixed request buffers and a deadline bound slow/oversized requests before JSON parsing.
  bool listening=false;
  for(;;){
    if(WiFi.status()!=WL_CONNECTED){if(listening){server.end();listening=false;}vTaskDelay(pdMS_TO_TICKS(20));continue;}
    if(!listening){server.begin();listening=true;Serial.print("HTTP ready: http://");Serial.println(WiFi.localIP());}
    WiFiClient client=server.available();
    if(!client){vTaskDelay(pdMS_TO_TICKS(2));continue;}
    client.setTimeout(1000);
    HttpRequest r;uint32_t started=millis();
    while(client.connected() && !r.done && !r.error && uint32_t(millis()-started)<1500){
      for(int n=0;n<128 && client.available() && !r.done && !r.error;n++)r.feed(char(client.read()));
      vTaskDelay(pdMS_TO_TICKS(1));
    }
    if(r.error)response(client,r.error,"{\"error\":\"invalid or oversized HTTP request\"}");
    else if(r.done)route(client,r);
    else response(client,408,"{\"error\":\"request timeout\"}");
    client.stop();
  }
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
 motionMutex=xSemaphoreCreateRecursiveMutex();
 if(!motionMutex){while(true)delay(1000);}
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
 filesystemReady=LittleFS.begin(false);
 WiFi.onEvent([](WiFiEvent_t event){if(event==ARDUINO_EVENT_WIFI_STA_DISCONNECTED || event==ARDUINO_EVENT_WIFI_STA_LOST_IP)networkLost.store(true);});
 WiFi.persistent(false);WiFi.mode(WIFI_STA);WiFi.setHostname("camx");WiFi.setAutoReconnect(true);
 if(WIFI_SSID[0])WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
 else Serial.println("Wi-Fi unconfigured: copy credentials.example.h to credentials.h and rebuild.");
 // Wi-Fi radio is active: seed a nonzero boot epoch before exposing HTTP.
 // This fences delayed packets from an earlier boot (not an authentication token).
 jogLease.seed(esp_random());
 if(xTaskCreatePinnedToCore(httpTask,"camx-http",16384,nullptr,1,nullptr,0)!=pdPASS){Serial.println("HTTP task failed; PWM remains disabled");while(true)delay(1000);}
 Serial.println("CAMX ready, PWM DISABLED. Waiting for Wi-Fi; STATUS works over serial.");lastTick=millis();
}
void loop(){
 // Check before network/serial handling; a pressed switch latches STOP, keeping torque.
 if(digitalRead(STOP_PIN)==LOW)halt();
 const bool connected=WiFi.status()==WL_CONNECTED;
 if(networkLost.exchange(false) || (networkWasConnected && !connected))connectionHold();
 networkWasConnected=connected;
 uint32_t networkNow=millis();
 if(!connected && WIFI_SSID[0] && uint32_t(networkNow-lastReconnect)>=10000){lastReconnect=networkNow;WiFi.reconnect();}
 for(int count=0;count<64 && Serial.available();count++){
  char c=Serial.read();if(c=='\r')continue;
  if(c=='\n'){if(serialOverflow)Serial.println("ERR line too long");else command(serialLine);serialLine="";serialOverflow=false;}
  else if(serialLine.length()<160 && !serialOverflow)serialLine+=c;
  else {serialOverflow=true;serialLine="";}
 }
 {Guard guard;
 uint32_t now=millis();if(jogLease.expired(now))connectionHold();if(armed && !stopped && !connectionPaused && uint32_t(now-lastCommand)>COMMAND_TIMEOUT_MS)connectionHold();
 if(uint32_t(now-lastTick)>=20){float dt=uint32_t(now-lastTick)/1000.0f;lastTick=now;
   if(digitalRead(STOP_PIN)==LOW)halt();
   if(armed){planner.tick(axes,dt);for(int i=0;i<2;i++)duty(i,pulseFor(axes[i].current,axes[i].config));}
 }
 }
 delay(1);
}
