import { Augment } from '../types';
import { legendaryAugmentImageMap } from './AugmentData/Legendary/legendaryAugmentImageMap';

// Import real augment data
import GoliathForce from './AugmentData/Forge/Brawler/GoliathForce_Original.json';
import IonShroud from './AugmentData/Forge/Brawler/IonShroud_Original.json';
import Mendoskeleton from './AugmentData/Forge/Brawler/Mendoskeleton_Original.json';
import Phagefire from './AugmentData/Forge/Brawler/Phagefire_Original.json';
import PhoenixSurge from './AugmentData/Forge/Brawler/PhoenixSurge_Original.json';
import SITDOWN from './AugmentData/Forge/Brawler/SITDOWN_Original.json';

// Energy augments
import Aethersteal from './AugmentData/Forge/Energy/Aethersteal_Original.json';
import ApexSupercharger from './AugmentData/Forge/Energy/ApexSupercharger_Original.json';
import ArcaneAccelerator from './AugmentData/Forge/Energy/ArcaneAccelerator_Original.json';

import AdaptiveReflection from './AugmentData/Legendary/AdaptiveReflection_Original.json';
import ArcaneConduit from './AugmentData/Legendary/ArcaneConduit_Original.json';
import Blightfire from './AugmentData/Legendary/Blightfire_Original.json';
import CelestialCycle from './AugmentData/Legendary/CelestialCycle_Original.json';
import Chronoguard from './AugmentData/Legendary/Chronoguard_Original.json';
import CorbomiteProtocol from './AugmentData/Legendary/CorbomiteProtocol_Original.json';
import EternalHunger from './AugmentData/Legendary/EternalHunger_Original.json';
import EvasiveVeiling from './AugmentData/Legendary/EvasiveVeiling_Original.json';
import FinalAbounding from './AugmentData/Legendary/FinalAbounding_Original.json';
import JaggedEnd from './AugmentData/Legendary/JaggedEnd_Original.json';
import LeviathansFury from './AugmentData/Legendary/LeviathansFury_Original.json';
import LifeStorm from './AugmentData/Legendary/LifeStorm_Original.json';
import OmnisourceSurge from './AugmentData/Legendary/OmnisourceSurge_Original.json';
import PowersAscent from './AugmentData/Legendary/PowersAscent_Original.json';
import RetributionsCall from './AugmentData/Legendary/RetributionsCall_Original.json';
import RuinationPrism from './AugmentData/Legendary/RuinationPrism_Original.json';
import TimesRespite from './AugmentData/Legendary/TimesRespite_Original.json';
import TitansRedoubt from './AugmentData/Legendary/TitansRedoubt_Original.json';
import Velthrax from './AugmentData/Legendary/Velthrax_Original.json';
import Voidcleaver from './AugmentData/Legendary/Voidcleaver_Original.json';

// Raw augment data interface
interface RawAugmentData {
  Name: string;
  DisplayName: string;
  DisplayDescription: string;
  DisplayDescriptionNormalized?: string;
  Type: string;
  Tier?: number;
  Stage?: number;
}

// Function to convert raw data to Augment interface
function convertToAugment(rawData: RawAugmentData, category: 'forge' | 'legendary', subcategory?: string): Augment {
  // Clean up the description by removing HTML tags and formatting
  const cleanDescription = (rawData.DisplayDescriptionNormalized || rawData.DisplayDescription)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\\r\\n/g, ' ') // Replace line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Determine tier based on category
  let tier: 'S' | 'A' | 'B' | 'C' = 'A';
  if (category === 'legendary') {
    tier = 'S';
  } else if (category === 'forge') {
    // Forge augments are generally A or B tier
    tier = Math.random() > 0.6 ? 'A' : 'B';
  }

  // Generate image URL using the same pattern as CompBuilder
  let imageUrl: string;
  if (category === 'legendary') {
    // For legendary augments, use the image map first, fallback to Firebase Storage
    const key = (rawData.DisplayName || rawData.Name || '').replace(/[^a-zA-Z0-9]/g, '');
    const imageName = (rawData.DisplayName || rawData.Name).replace(/ /g, '%20') + '.PNG';
    const fallbackUrl = `https://firebasestorage.googleapis.com/v0/b/illuvilytics.firebasestorage.app/o/Augments%2F${imageName}?alt=media`;
    imageUrl = legendaryAugmentImageMap[key] || fallbackUrl;
  } else {
    // For forge augments, use Firebase Storage pattern
    const imageName = (rawData.DisplayName || rawData.Name).replace(/ /g, '%20') + '.PNG';
    imageUrl = `https://firebasestorage.googleapis.com/v0/b/illuvilytics.firebasestorage.app/o/Augments%2F${imageName}?alt=media`;
  }

  return {
    id: rawData.Name.toLowerCase().replace(/\s+/g, '-'),
    name: rawData.DisplayName,
    description: cleanDescription,
    tier,
    type: category === 'legendary' ? 'prismatic' : category === 'forge' ? 'gold' : 'silver',
    sourceType: category,
    category: subcategory || category,
    image: imageUrl
  };
}

// Create real Illuvium augments
export const realIlluviumAugments: Augment[] = [
  // Forge - Brawler augments
  convertToAugment(GoliathForce as RawAugmentData, 'forge', 'Brawler'),
  convertToAugment(IonShroud as RawAugmentData, 'forge', 'Brawler'),
  convertToAugment(Mendoskeleton as RawAugmentData, 'forge', 'Brawler'),
  convertToAugment(Phagefire as RawAugmentData, 'forge', 'Brawler'),
  convertToAugment(PhoenixSurge as RawAugmentData, 'forge', 'Brawler'),
  convertToAugment(SITDOWN as RawAugmentData, 'forge', 'Brawler'),

  // Forge - Energy augments
  convertToAugment(Aethersteal as RawAugmentData, 'forge', 'Energy'),
  convertToAugment(ApexSupercharger as RawAugmentData, 'forge', 'Energy'),
  convertToAugment(ArcaneAccelerator as RawAugmentData, 'forge', 'Energy'),

  // Legendary augments
  convertToAugment(AdaptiveReflection as RawAugmentData, 'legendary'),
  convertToAugment(ArcaneConduit as RawAugmentData, 'legendary'),
  convertToAugment(Blightfire as RawAugmentData, 'legendary'),
  convertToAugment(CelestialCycle as RawAugmentData, 'legendary'),
  convertToAugment(Chronoguard as RawAugmentData, 'legendary'),
  convertToAugment(CorbomiteProtocol as RawAugmentData, 'legendary'),
  convertToAugment(EternalHunger as RawAugmentData, 'legendary'),
  convertToAugment(EvasiveVeiling as RawAugmentData, 'legendary'),
  convertToAugment(FinalAbounding as RawAugmentData, 'legendary'),
  convertToAugment(JaggedEnd as RawAugmentData, 'legendary'),
  convertToAugment(LeviathansFury as RawAugmentData, 'legendary'),
  convertToAugment(LifeStorm as RawAugmentData, 'legendary'),
  convertToAugment(OmnisourceSurge as RawAugmentData, 'legendary'),
  convertToAugment(PowersAscent as RawAugmentData, 'legendary'),
  convertToAugment(RetributionsCall as RawAugmentData, 'legendary'),
  convertToAugment(RuinationPrism as RawAugmentData, 'legendary'),
  convertToAugment(TimesRespite as RawAugmentData, 'legendary'),
  convertToAugment(TitansRedoubt as RawAugmentData, 'legendary'),
  convertToAugment(Velthrax as RawAugmentData, 'legendary'),
  convertToAugment(Voidcleaver as RawAugmentData, 'legendary')
];

export default realIlluviumAugments; 