// Products supplied by the user. Keep their table as the nutrition source;
// packaging photographs do not override these values or imply a specific flavour.
const product = (id, name, brand, unit, kcal, protein, carbs, fat, extra={}) => ({
  id:`favorite:${id}`, name, brand, unit, source:'Twoja tabela',
  image:`/foods/fav-${id}.webp`, imageFit:'contain',
  kcal, protein, carbs, fat, ...extra,
});

export const FAVORITE_FOODS = [
  product('lidl-protein-milk','Mleko wysokobiałkowe','Lidl · Pilos High Protein','ml',54,8,4.7,0.5,{fatLessThan:true}),
  product('piatnica-cream-18','Śmietana 18%','Piątnica','g',191,2.5,4.8,18),
  product('hochland-gouda','Gouda','Hochland','g',243,16,6.6,17),
  product('lidl-protein-cheese','Ser wysokobiałkowy','Lidl · Milbona High Protein','g',198,31,0,8.2),
  product('lidl-protein-cup','High Protein, kubek','Lidl','g',71,10,6.7,0.3,{
    imageNote:'Zdjęcie poglądowe serii High Protein. Smak kubka nie został określony.',
  }),
  product('laciate-milk-32','Mleko Łaciate 3,2%','Mlekpol · Łaciate','ml',60,3.2,4.7,3.2),
  product('cincin-rose-zero','Cin&Cin Rosé 0%','Cin&Cin','ml',22,0,5.3,0),
];
