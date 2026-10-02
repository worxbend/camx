#include "http_request.h"
#include "motion.h"
#include <cassert>
#include <string>
#include <random>
#include <iostream>
HttpRequest request(const std::string &s){HttpRequest r;for(char c:s)r.feed(c);return r;}
std::string post(const std::string &body){return "POST /move HTTP/1.1\r\nHost: camx\r\nContent-Type: application/json\r\nX-CAMX-Request: 1\r\nContent-Length: "+std::to_string(body.size())+"\r\n\r\n"+body;}
int main(){
 float p=88,t=99;
 const std::string good="{\"pan\":15,\"tilt\":-5}";
 assert(parseMove(good.c_str(),p,t)&&p==15&&t==-5);
 assert(parseMove(" { \"tilt\": -2.5e0 , \"pan\": 1e1 } \n",p,t)&&p==10&&t==-2.5);
 for(const char *bad:{"", "{", "{\"pan\"", "{\"pan\":", "{\"pan\":1}", "{\"pan\":1,\"pan\":2}", "{\"pan\":1,\"tilt\":2}junk", "{\"pan\":1,\"tilt\":2,\"x\":3}", "{\"pan\":\"1\",\"tilt\":2}", "{\"pan\":true,\"tilt\":2}", "{\"pan\":NaN,\"tilt\":2}", "{\"pan\":1e999,\"tilt\":2}", "{\"pan\":01,\"tilt\":2}", "{\"pan\":+1,\"tilt\":2}", "{\"pan\":.5,\"tilt\":2}", "{\"pan\":0x1,\"tilt\":2}", "{\"pan\":1.,\"tilt\":2}", "{\"pan\":[],\"tilt\":2}"}){p=88;t=99;assert(!parseMove(bad,p,t));assert(p==88&&t==99);}
 for(size_t n=0;n<good.size();n++)assert(!parseMove(good.substr(0,n).c_str(),p,t));
 auto r=request(post(good));assert(r.done&&!r.error&&!strcmp(r.body,good.c_str()));
 assert(!strcmp(r.intent,"1")&&!strcmp(r.contentType,"application/json"));
 r=request("GET /status HTTP/1.1\r\nHost: camx\r\n\r\n");assert(r.done&&!r.error);
 for(const std::string &bad:{std::string("POST /move HTTP/1.1\r\n\r\n"),std::string("POST /move HTTP/1.1\r\nContent-Length: -1\r\n\r\n"),std::string("POST /move HTTP/1.1\r\nContent-Length: 1\r\nContent-Length: 1\r\n\r\nx"),std::string("POST /move HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n"),std::string("GET /status HTTP/1.1\r\nContent-Length: 1\r\n\r\nx")})assert(request(bad).error==400);
 assert(request(post(std::string(385,'x'))).error==413);
 assert(request(std::string(2049,'x')).error==413);
 r=request("POST /move HTTP/1.1\r\nContent-Length: 3\r\n\r\nx");assert(!r.done&&!r.error);
 auto message=post(good);for(size_t n=0;n<message.size();n++){r=request(message.substr(0,n));assert(!r.done&&!r.error);}
 Axis axes[2];axes[1].config.minimum=-25;axes[1].config.maximum=25;
 assert(setTargets(axes,15,-5));assert(!setTargets(axes,20,26));assert(axes[0].target==15&&axes[1].target==-5);
 assert(!setTargets(axes,INFINITY,0));assert(setTargets(axes,15,-5));assert(axes[0].target==15);
 int axis=9;AxisConfig config;config.center=1555;
 const std::string calibration=R"({"axis":1,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"speed":5})";
 assert(parseCalibration(calibration.c_str(),axis,config)&&axis==1&&config.center==1500&&!config.invert);
 assert(request(post(calibration)).done);
 for(size_t n=0;n<calibration.size();n++)assert(!parseCalibration(calibration.substr(0,n).c_str(),axis,config));
 for(const char *bad:{
 R"({"axis":1,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":0,"speed":5})",
 R"({"axis":1,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":26,"invert":false,"speed":5})",
 R"({"axis":1,"center":1500.5,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"speed":5})",
 R"({"axis":1,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"axis":1})",
 R"({"axis":1,"center":1500,"low":1400,"high":1600,"minimum":-10,"maximum":10,"invert":false,"speed":5}x)"
 }){axis=9;config.center=1555;assert(!parseCalibration(bad,axis,config));assert(axis==9&&config.center==1555);}
 for(int a=0;a<2;a++)for(int b=0;b<2;b++)for(int c=0;c<2;c++)assert(controlLeaseAllowed(a,b,c)==bool(a&&!b&&!c));
 assert(safeControlPath("/control/"));assert(safeControlPath("/control/assets/index-Ab_01.js"));
 for(const char *bad:{"/control","/control/../credentials.h","/control/assets/../x","/control/assets/%2e%2e","/control/assets/a/b","/control/assets/","/control/assets/a?x"})assert(!safeControlPath(bad));
 auto maximum=request(post(std::string(384,'x')));assert(maximum.done&&!maximum.error&&strlen(maximum.body)==384);
 double jp=99,jt=88;uint32_t je=7,js=8;
 assert(parseJog(R"({"pan":1,"tilt":-0.5,"epoch":4294967295,"seq":1})",jp,jt,je,js));assert(jp==1&&jt==-.5&&je==UINT32_MAX&&js==1);
 const std::string jogBody=R"({"pan":0,"tilt":0,"epoch":2,"seq":3})";
 for(size_t n=0;n<jogBody.size();n++)assert(!parseJog(jogBody.substr(0,n).c_str(),jp,jt,je,js));
 for(const char *bad:{R"({"pan":1.1,"tilt":0,"epoch":1,"seq":1})",R"({"pan":1,"tilt":0,"epoch":-1,"seq":1})",R"({"pan":1,"tilt":0,"epoch":1,"seq":4294967296})",R"({"pan":1,"tilt":0,"epoch":1,"seq":1.5})",R"({"pan":1,"tilt":0,"epoch":1,"epoch":2})",R"({"pan":true,"tilt":0,"epoch":1,"seq":1})",R"({"pan":1,"tilt":0,"epoch":1,"seq":1}x)"}){jp=99;jt=88;je=7;js=8;assert(!parseJog(bad,jp,jt,je,js));assert(jp==99&&jt==88&&je==7&&js==8);}
 // JSON whitespace is only SP, TAB, CR, LF, never VT or FF.
 assert(parseMove(("\t\r\n"+good).c_str(),p,t));
 assert(parseCalibration(("\t\r\n"+calibration).c_str(),axis,config));
 assert(parseJog(("\t\r\n"+jogBody).c_str(),jp,jt,je,js));
 for(char invalidWhitespace:{'\v','\f'}){
   for(const auto &schema:{good,calibration,jogBody}){
     for(size_t insertion:{size_t(0),size_t(1),schema.find(':')+1,schema.size()}){
       const auto bad=schema.substr(0,insertion)+invalidWhitespace+schema.substr(insertion);
       if(schema==good)assert(!parseMove(bad.c_str(),p,t));
       else if(schema==calibration)assert(!parseCalibration(bad.c_str(),axis,config));
       else assert(!parseJog(bad.c_str(),jp,jt,je,js));
     }
   }
 }
 std::mt19937 rng(42);
 for(int i=0;i<30000;i++){
   std::string fuzz;int n=rng()%256;for(int j=0;j<n;j++)fuzz+=char(rng()%128);
   parseMove(fuzz.c_str(),p,t);parseCalibration(fuzz.c_str(),axis,config);parseJog(fuzz.c_str(),jp,jt,je,js);safeControlPath(fuzz.c_str());request(fuzz);
 }
 std::cout<<"HTTP/JSON, atomic motion, truncation and 30000 fuzz cases passed\n";
}
