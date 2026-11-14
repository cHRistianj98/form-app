// Units are fixed per key, shared by the editor, calculations and Worker API.
export const NUTRIENTS = [
  ['fiber','Błonnik','g'], ['sugars','Cukry ogółem','g'], ['saturatedFat','Tłuszcze nasycone','g'], ['salt','Sól','g'],
  ['calcium','Wapń','mg'], ['iron','Żelazo','mg'], ['potassium','Potas','mg'], ['magnesium','Magnez','mg'],
  ['vitaminA','Witamina A','µg RE'], ['vitaminC','Witamina C','mg'], ['vitaminD','Witamina D','µg'],
  ['vitaminE','Witamina E','mg'], ['vitaminK','Witamina K','µg'],
  ['b1','B1 · tiamina','mg'], ['b2','B2 · ryboflawina','mg'], ['b3','B3 · niacyna','mg NE'],
  ['b5','B5 · kwas pantotenowy','mg'], ['b6','Witamina B6','mg'], ['biotin','B7 · biotyna','µg'],
  ['folate','B9 · foliany','µg'], ['b12','Witamina B12','µg'],
];
export const MACRO_FIELDS = ['kcal','protein','carbs','fat'];
export const NUTRIENT_FIELDS = [...MACRO_FIELDS,...NUTRIENTS.map(([key])=>key)];
export const VITAMIN_KEYS = ['vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','b1','b2','b3','b5','b6','biotin','folate','b12'];
export const MINERAL_KEYS = ['calcium','iron','potassium','magnesium'];

export const REFERENCE_SOURCES = [
  {name:'RWS dla dorosłych — rozporządzenie UE 1169/2011, załącznik XIII',url:'https://eur-lex.europa.eu/eli/reg/2011/1169/oj/eng'},
  {name:'Błonnik 25 g/dzień — EFSA',url:'https://www.efsa.europa.eu/en/efsajournal/pub/1462'},
];
// Label reference intakes, not personalised requirements or tolerable upper limits.
export const DAILY_REFERENCES = {
  fiber:{value:25,source:'EFSA'}, sugars:{value:90,source:'RWS UE · 2000 kcal'},
  saturatedFat:{value:20,source:'RWS UE · 2000 kcal'}, salt:{value:6,source:'RWS UE · 2000 kcal'},
  calcium:{value:800,source:'RWS UE'},iron:{value:14,source:'RWS UE'},
  potassium:{value:2000,source:'RWS UE'},magnesium:{value:375,source:'RWS UE'},
  vitaminA:{value:800,source:'RWS UE'},vitaminC:{value:80,source:'RWS UE'},vitaminD:{value:5,source:'RWS UE'},
  vitaminE:{value:12,source:'RWS UE'},vitaminK:{value:75,source:'RWS UE'},
  b1:{value:1.1,source:'RWS UE'},b2:{value:1.4,source:'RWS UE'},b3:{value:16,source:'RWS UE'},
  b5:{value:6,source:'RWS UE'},b6:{value:1.4,source:'RWS UE'},biotin:{value:50,source:'RWS UE'},
  folate:{value:200,source:'RWS UE'},b12:{value:2.5,source:'RWS UE'},
};
