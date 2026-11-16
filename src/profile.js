// Shared by the browser and the Worker so persisted profiles use the same model.
import {DEFAULT_SUPPLEMENT_PLAN,normalizeSupplementPlan} from './supplementPlan.js';
export const DEFAULT_PROFILE = {
  nutritionVersion: 2,
  height: 186, startWeight: 93, targetWeight: 85, age: 28, sex: 'male',
  energyMethod: 'mifflin', activityLevel: 'low',
  deficitMode: 'percent', deficitPercent: 15, deficit: 450,
  manualCalories: 2600, manualProtein: 180, proteinFactor: 2, fatFactor: 0.8,
  supplementPlan: DEFAULT_SUPPLEMENT_PLAN,
};

export function normalizeProfile(profile) {
  const supplementPlan=normalizeSupplementPlan(profile?.supplementPlan);
  if (!profile) return {...DEFAULT_PROFILE,supplementPlan};
  if (profile.nutritionVersion === 2) return {...DEFAULT_PROFILE, ...profile,supplementPlan};
  const p = {...DEFAULT_PROFILE, ...profile, nutritionVersion: 2,supplementPlan};
  // Replace the previous built-in 1899 kcal / 153 g starting plan. Preserve
  // explicitly chosen calories, deficits and protein factors from older profiles.
  p.manualCalories = Number(profile.manualCalories) > 0 ? Number(profile.manualCalories) : 2600;
  if (profile.deficit != null && Number(profile.deficit) !== 450) p.deficitMode = 'kcal';
  if (profile.proteinFactor != null && Number(profile.proteinFactor) !== 1.8) {
    p.manualProtein = Math.round(Number(profile.proteinFactor) * p.targetWeight);
    p.proteinFactor = 2;
  } else {
    p.manualProtein = 180;
    p.proteinFactor = 2;
  }
  return p;
}

// Adult PAL categories from DRI 2023. Representative PAL values apply only
// to Mifflin; EER uses its own category-specific total-energy equations.
export const ACTIVITY_LEVELS = [
  {id:'inactive', name:'Niska', pal:1.4, description:'Głównie siedzenie, codzienne czynności i niewiele dodatkowego ruchu.'},
  {id:'low', name:'Lekka', pal:1.6, description:'Praca głównie siedząca, regularne spacery lub lekka aktywność. Domyślne założenie — dopasuj do siebie.'},
  {id:'active', name:'Aktywna', pal:1.75, description:'Dużo ruchu w ciągu dnia i regularne treningi.'},
  {id:'very', name:'Bardzo aktywna', pal:2.0, description:'Praca fizyczna lub duża objętość treningów i ruchu na co dzień.'},
];

export const NUTRITION_SOURCES = [
  {name:'Mifflin–St Jeor (1990)', url:'https://pubmed.ncbi.nlm.nih.gov/2305711/'},
  {name:'DRI 2023 / Health Canada — równania EER i poziomy aktywności', url:'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html'},
  {name:'NIDDK — dobór aktywności i obserwacja masy ciała', url:'https://www.niddk.nih.gov/bwp'},
  {name:'ISSN — białko u osób aktywnych (2017)', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/'},
];
