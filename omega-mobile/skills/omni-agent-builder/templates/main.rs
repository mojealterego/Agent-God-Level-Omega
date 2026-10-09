//! Deterministic agent graph executor. Network/memory/LLM plugins are separate gates.
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;

fn as_text(value: &Value) -> String {
    match value { Value::String(s) => s.clone(), _ => value.to_string() }
}
fn apply(operation: &str, data: &Value, config: &Value) -> Result<Value, Box<dyn Error>> {
    let s=as_text(data);
    Ok(match operation {
        "echo" => data.clone(),
        "uppercase" => json!(s.to_uppercase()),
        "lowercase" => json!(s.to_lowercase()),
        "prefix" => json!(format!("{}{}",config.get("prefix").and_then(Value::as_str).unwrap_or(""),s)),
        "suffix" => json!(format!("{}{}",s,config.get("suffix").and_then(Value::as_str).unwrap_or(""))),
        "reverse" => json!(s.chars().rev().collect::<String>()),
        "count" => json!(match data { Value::Array(a) => a.len(), Value::Object(o) => o.len(),Value::String(t)=>t.chars().count(),_=>1 }),
        "json_extract" => {
            let obj=if data.is_string(){serde_json::from_str::<Value>(&s)?}else{data.clone()};
            let key=config.get("key").and_then(Value::as_str).ok_or("missing config key")?;
            obj.get(key).ok_or("missing property")?.clone()
        },
        _ => return Err("unknown operation".into())
    })
}
fn run(spec: &Value, input: Value) -> Result<Value, Box<dyn Error>> {
    let agents=spec["agents"].as_array().ok_or("agents must be array")?;
    let edges=spec["edges"].as_array().ok_or("edges must be array")?;
    let mut degree: BTreeMap<String,usize>=BTreeMap::new();
    let mut by_name:BTreeMap<String,&Value>=BTreeMap::new();
    let mut adjacency:BTreeMap<String,Vec<String>>=BTreeMap::new();
    let mut parents:BTreeMap<String,Vec<String>>=BTreeMap::new();
    for agent in agents {
        let name=agent["name"].as_str().ok_or("agent name missing")?.to_string();
        if degree.insert(name.clone(),0).is_some(){return Err("duplicate agent".into())}
        by_name.insert(name.clone(),agent);adjacency.insert(name.clone(),vec![]);parents.insert(name,vec![]);
    }
    for edge in edges {
        let pair=edge.as_array().ok_or("invalid edge")?;
        if pair.len()!=2{return Err("edge length".into())}
        let src=pair[0].as_str().ok_or("bad source")?.to_string();
        let dst=pair[1].as_str().ok_or("bad destination")?.to_string();
        if !degree.contains_key(&src)||!degree.contains_key(&dst){return Err("unknown endpoint".into())}
        *degree.get_mut(&dst).ok_or("missing indegree")?+=1;
        adjacency.get_mut(&src).ok_or("missing adjacency")?.push(dst.clone());
        parents.get_mut(&dst).ok_or("missing parents")?.push(src);
    }
    let mut ready:BTreeSet<String>=degree.iter().filter(|(_,d)|**d==0).map(|(n,_)|n.clone()).collect();
    let mut order=vec![];let mut results=BTreeMap::<String,Value>::new();
    while let Some(node)=ready.pop_first(){
        let incoming=parents.get(&node).ok_or("missing input")?;
        let input_data=match incoming.len(){
            0=>input.clone(),1=>results.get(&incoming[0]).ok_or("upstream missing")?.clone(),
            _=>{let mut sorted=incoming.clone();sorted.sort();Value::Array(sorted.iter().map(|p|results[p].clone()).collect())}
        };
        let agent=by_name.get(&node).ok_or("unknown agent")?;
        results.insert(node.clone(),apply(agent["operation"].as_str().ok_or("missing op")?,&input_data,&agent["config"])?);
        order.push(node.clone());
        for next in adjacency.get(&node).ok_or("missing adjacency")?{
            let count=degree.get_mut(next).ok_or("missing degree")?;
            *count=count.checked_sub(1).ok_or("negative degree")?;
            if *count==0{ready.insert(next.clone());}
        }
    }
    if order.len()!=agents.len(){return Err("cyclic graph".into())}
    Ok(json!({"order":order,"results":results}))
}
fn main()->Result<(),Box<dyn Error>>{
    let args:Vec<String>=std::env::args().collect();
    if args.len()<2||args[1]!="run"{return Err("usage: cargo run -- run [input]".into())}
    let input=args.get(2).cloned().unwrap_or_default();
    let spec:Value=serde_json::from_str(&std::fs::read_to_string("spec.json")?)?;
    println!("{}",run(&spec,json!(input))?);
    Ok(())
}
