#pragma once
#include <ArduinoJson.h>
#include <cstring>
#include <cstdlib>
#include <cctype>
#include <cmath>
// Exactly two unique numeric fields; strict JSON syntax and no trailing data.
inline bool parseMove(const char *body,float &pan,float &tilt){
  // ArduinoJson accepts trailing characters and replaces duplicate keys. This small
  // schema scanner rejects both before the library validates number syntax.
  const char *p=body;auto ws=[&](){while(*p && std::isspace(static_cast<unsigned char>(*p)))p++;};
  ws();if(*p!='{')return false;p++;
  bool seenPan=false,seenTilt=false;
  for(int i=0;i<2;i++){
    ws();if(*p!='"')return false;p++;
    const char *key=p;while(*p && *p!='"')p++;if(!*p)return false;
    size_t n=p-key;bool isPan=n==3 && !strncmp(key,"pan",3),isTilt=n==4 && !strncmp(key,"tilt",4);
    if((!isPan&&!isTilt)||(isPan&&seenPan)||(isTilt&&seenTilt))return false;
    seenPan|=isPan;seenTilt|=isTilt;p++;ws();if(*p!=':')return false;p++;ws();
    // Restrict to JSON numbers (reject strings, booleans, NaN, hex and infinities).
    if(*p=='-')p++;
    if(*p=='0')p++;else {if(*p<'1'||*p>'9')return false;while(*p>='0'&&*p<='9')p++;}
    if(*p=='.'){p++;if(*p<'0'||*p>'9')return false;while(*p>='0'&&*p<='9')p++;}
    if(*p=='e'||*p=='E'){p++;if(*p=='+'||*p=='-')p++;if(*p<'0'||*p>'9')return false;while(*p>='0'&&*p<='9')p++;}
    ws();if(*p!=(i==0?',':'}'))return false;p++;
  }
  ws();if(*p)return false;
  JsonDocument doc;
  if(deserializeJson(doc,body,DeserializationOption::NestingLimit(1)))return false;
  float a=doc["pan"].as<float>(),b=doc["tilt"].as<float>();
  if(!std::isfinite(a)||!std::isfinite(b))return false;
  pan=a;tilt=b;return true;
}
struct HttpRequest {
  char headers[2049]{},body[129]{},method[8]{},path[40]{},contentType[80]{},authorization[160]{},intent[8]{};
  size_t used=0,bodyUsed=0,contentLength=0;bool headerDone=false,done=false;int error=0;
  static bool equal(const char *a,const char *b){while(*a&&*b){if(std::tolower(static_cast<unsigned char>(*a++))!=std::tolower(static_cast<unsigned char>(*b++)))return false;}return *a==*b;}
  template<size_t N>bool copy(char (&dst)[N],const char *src){if(strlen(src)>=N){error=400;return false;}strcpy(dst,src);return true;}
  void parseHeaders(){
    char *line=headers;char *end=strstr(line,"\r\n");if(!end){error=400;return;}*end=0;
    char *space=strchr(line,' ');if(!space){error=400;return;}*space++=0;if(!copy(method,line))return;
    char *version=strchr(space,' ');if(!version){error=400;return;}*version++=0;
    if(strcmp(version,"HTTP/1.1") && strcmp(version,"HTTP/1.0")){error=400;return;}
    if(!copy(path,space))return;
    bool lengthSeen=false,typeSeen=false,authSeen=false,intentSeen=false;
    line=end+2;
    while(*line){end=strstr(line,"\r\n");if(!end){error=400;return;}*end=0;if(!*line)break;
      char *colon=strchr(line,':');if(!colon){error=400;return;}*colon++=0;while(*colon==' '||*colon=='\t')colon++;
      char *tail=colon+strlen(colon);while(tail>colon&&(tail[-1]==' '||tail[-1]=='\t'))*--tail=0;
      if(equal(line,"Transfer-Encoding")){error=400;return;}
      if(equal(line,"Content-Length")){
        if(lengthSeen || !*colon){error=400;return;}lengthSeen=true;size_t n=0;
        for(char *q=colon;*q;q++){if(*q<'0'||*q>'9'){error=400;return;}n=n*10+(*q-'0');if(n>128){error=413;return;}}
        contentLength=n;
      }else if(equal(line,"Content-Type")){if(typeSeen){error=400;return;}typeSeen=true;if(!copy(contentType,colon))return;}
      else if(equal(line,"Authorization")){if(authSeen){error=400;return;}authSeen=true;if(!copy(authorization,colon))return;}
      else if(equal(line,"X-CAMX-Request")){if(intentSeen){error=400;return;}intentSeen=true;if(!copy(intent,colon))return;}
      line=end+2;
    }
    if(!strcmp(method,"POST")&&!lengthSeen){error=400;return;}
    if(!strcmp(method,"GET")&&contentLength){error=400;return;}
    headerDone=true;done=contentLength==0;
  }
  void feed(char c){
    if(done||error)return;
    if(!headerDone){
      if(c==0 || (static_cast<unsigned char>(c)<32 && c!='\r'&&c!='\n'&&c!='\t')){error=400;return;}
      if(used==2048){error=413;return;}headers[used++]=c;
      if(used>=4&&!memcmp(headers+used-4,"\r\n\r\n",4))parseHeaders();
    }else{if(c==0){error=400;return;}body[bodyUsed++]=c;if(bodyUsed==contentLength)done=true;}
  }
};
