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
 assert(request(post(std::string(129,'x'))).error==413);
 assert(request(std::string(2049,'x')).error==413);
 r=request("POST /move HTTP/1.1\r\nContent-Length: 3\r\n\r\nx");assert(!r.done&&!r.error);
 auto message=post(good);for(size_t n=0;n<message.size();n++){r=request(message.substr(0,n));assert(!r.done&&!r.error);}
 Axis axes[2];axes[1].config.minimum=-25;axes[1].config.maximum=25;
 assert(setTargets(axes,15,-5));assert(!setTargets(axes,20,26));assert(axes[0].target==15&&axes[1].target==-5);
 assert(!setTargets(axes,INFINITY,0));assert(setTargets(axes,15,-5));assert(axes[0].target==15);
 std::mt19937 rng(42);
 for(int i=0;i<30000;i++){
   std::string fuzz;int n=rng()%256;for(int j=0;j<n;j++)fuzz+=char(rng()%128);
   parseMove(fuzz.c_str(),p,t);request(fuzz);
 }
 std::cout<<"HTTP/JSON, atomic motion, truncation and 30000 fuzz cases passed\n";
}
