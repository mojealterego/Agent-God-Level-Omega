function finite(value,name){const n=Number(value);if(!Number.isFinite(n))throw new Error(name+' must be a finite number');return n}
function nonNegative(value,name){const n=finite(value,name);if(n<0)throw new Error(name+' must be >= 0');return n}
const round=v=>Math.round((v+Number.EPSILON)*100)/100;

export function unitEconomics(input={}){
  const price=nonNegative(input.price,'price');
  const fields=['materials','labor','packaging','energy','waste','salesFees','logistics','taxPerUnit','otherVariable'];
  const costs=Object.fromEntries(fields.map(k=>[k,nonNegative(input[k]??0,k)]));
  const variableCost=round(Object.values(costs).reduce((a,b)=>a+b,0));
  const contribution=round(price-variableCost);
  const contributionMargin=price===0?null:round(contribution/price);
  const fixedCosts=nonNegative(input.fixedCosts??0,'fixedCosts');
  const breakEvenUnits=contribution>0?Math.ceil(fixedCosts/contribution):null;
  return {price,costs,variableCost,contribution,contributionMargin,fixedCosts,breakEvenUnits,profitablePerUnit:contribution>0};
}

export function scenarioModel(input={}){
  if(!Array.isArray(input.scenarios)||input.scenarios.length===0)throw new Error('scenarios must be a non-empty array');
  return input.scenarios.map((s,index)=>{
    const name=String(s.name??('scenario-'+(index+1)));
    const units=nonNegative(s.units,'units');
    const months=nonNegative(s.months??1,'months');
    const price=nonNegative(s.price,'price');
    const variableCostPerUnit=nonNegative(s.variableCostPerUnit??0,'variableCostPerUnit');
    const fixedCostsPerMonth=nonNegative(s.fixedCostsPerMonth??0,'fixedCostsPerMonth');
    const revenue=round(units*price*months);
    const variableCosts=round(units*variableCostPerUnit*months);
    const fixedCosts=round(fixedCostsPerMonth*months);
    const operatingResult=round(revenue-variableCosts-fixedCosts);
    return {name,units,months,price,variableCostPerUnit,fixedCostsPerMonth,revenue,variableCosts,fixedCosts,operatingResult};
  });
}

export function budgetAudit(items=[]){
  if(!Array.isArray(items))throw new Error('items must be an array');
  const audited=items.map((item,index)=>{
    const quantity=nonNegative(item.quantity??1,'quantity');
    const unitPrice=nonNegative(item.unitPrice??0,'unitPrice');
    const value=round(quantity*unitPrice);
    const necessityScore=Number(item.necessityScore);
    if(!Number.isInteger(necessityScore)||necessityScore<0||necessityScore>5)throw new Error('necessityScore must be an integer 0..5');
    const eligibility=['ELIGIBLE','INELIGIBLE','TO_VERIFY'].includes(item.eligibility)?item.eligibility:'TO_VERIFY';
    const evidenceVerified=item.evidenceVerified===true;
    const justification=String(item.justification??'').trim();
    const blockers=[];
    if(eligibility==='INELIGIBLE')blockers.push('INELIGIBLE');
    if(eligibility==='TO_VERIFY')blockers.push('ELIGIBILITY_TO_VERIFY');
    if(!evidenceVerified)blockers.push('PRICE_EVIDENCE_UNVERIFIED');
    if(!justification)blockers.push('MISSING_JUSTIFICATION');
    if(necessityScore<4)blockers.push('WEAK_NECESSITY');
    return {id:String(item.id??('item-'+(index+1))),name:String(item.name??''),quantity,unitPrice,value,eligibility,evidenceVerified,necessityScore,justification,blockers};
  });
  return {items:audited,total:round(audited.reduce((sum,x)=>sum+x.value,0)),passed:audited.every(x=>x.blockers.length===0)};
}
