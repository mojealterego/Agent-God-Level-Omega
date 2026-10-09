package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "os"
    "sort"
    "strings"
    "unicode/utf8"
)

type Agent struct { Name string `json:"name"`; Operation string `json:"operation"`; Config map[string]interface{} `json:"config"` }
type Spec struct { Agents []Agent `json:"agents"`; Edges [][]string `json:"edges"` }

func parseSpec() (Spec,error) {
    data,err:=os.ReadFile("spec.json"); if err!=nil{return Spec{},err}
    var spec Spec
    err=json.Unmarshal(data,&spec);return spec,err
}
func plan(spec Spec)([]string,error){
    degree:=map[string]int{}; children:=map[string][]string{}
    for _,agent:=range spec.Agents { degree[agent.Name]=0;children[agent.Name]=[]string{} }
    if len(degree)!=len(spec.Agents){return nil,errors.New("duplicate agent")}
    for _,e:=range spec.Edges {
        if len(e)!=2{return nil,errors.New("invalid edge")}
        _,ok1:=degree[e[0]];_,ok2:=degree[e[1]]
        if !ok1||!ok2{return nil,errors.New("unknown agent")}
        degree[e[1]]++; children[e[0]]=append(children[e[0]],e[1])
    }
    ready:=[]string{}; for n,d:=range degree{if d==0{ready=append(ready,n)}}
    sort.Strings(ready);order:=[]string{}
    for len(ready)>0{n:=ready[0];ready=ready[1:];order=append(order,n)
        for _,next:=range children[n]{degree[next]--;if degree[next]==0{ready=append(ready,next)}}
        sort.Strings(ready)
    }
    if len(order)!=len(spec.Agents){return nil,errors.New("cycle detected")}
    return order,nil
}
func valString(v interface{})string{if s,ok:=v.(string);ok{return s};return fmt.Sprint(v)}
func configStr(m map[string]interface{},key string)string{if v,ok:=m[key];ok{return valString(v)};return ""}
func apply(a Agent,payload interface{})(interface{},error){
    s:=valString(payload)
    switch a.Operation {
    case "echo":return payload,nil
    case "uppercase":return strings.ToUpper(s),nil
    case "lowercase":return strings.ToLower(s),nil
    case "prefix":return configStr(a.Config,"prefix")+s,nil
    case "suffix":return s+configStr(a.Config,"suffix"),nil
    case "reverse":r:=[]rune(s);for i,j:=0,len(r)-1;i<j;i,j=i+1,j-1{r[i],r[j]=r[j],r[i]};return string(r),nil
    case "count":switch v:=payload.(type){case string:return utf8.RuneCountInString(v),nil;case []interface{}:return len(v),nil;case map[string]interface{}:return len(v),nil;default:return 1,nil}
    case "json_extract": key:=configStr(a.Config,"key");var obj map[string]interface{}
        if s,ok:=payload.(string);ok{if err:=json.Unmarshal([]byte(s),&obj);err!=nil{return nil,err}}else{var ok bool;obj,ok=payload.(map[string]interface{});if !ok{return nil,errors.New("expected object")}}
        result,ok:=obj[key];if !ok{return nil,errors.New("missing key")};return result,nil
    default:return nil,errors.New("unknown operation")
    }
}
func run(spec Spec,input interface{})(map[string]interface{},error){
    order,err:=plan(spec);if err!=nil{return nil,err}
    byName:=map[string]Agent{};for _,agent:=range spec.Agents{byName[agent.Name]=agent}
    results:=map[string]interface{}{}
    for _,name:=range order{
        parents:=[]string{};for _,e:=range spec.Edges{if e[1]==name{parents=append(parents,e[0])}}
        sort.Strings(parents)
        value:=input
        if len(parents)==1{value=results[parents[0]]}else if len(parents)>1{
            arr:=[]interface{}{};for _,p:=range parents{arr=append(arr,results[p])};value=arr
        }
        output,err:=apply(byName[name],value);if err!=nil{return nil,fmt.Errorf("agent %s: %w",name,err)}
        results[name]=output
    }
    return map[string]interface{}{"order":order,"results":results},nil
}
func main(){
    if len(os.Args)<2||os.Args[1]!="run"{fmt.Fprintln(os.Stderr,"usage: go run . run [input]");os.Exit(2)}
    payload:="";if len(os.Args)>2{payload=os.Args[2]}
    spec,err:=parseSpec();if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
    result,err:=run(spec,payload);if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
    output,err:=json.Marshal(result);if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
    fmt.Println(string(output))
}
