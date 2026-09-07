import * as THREE from 'three';
import { WEATHER_TYPE } from './WeatherSystem.js';

export const BIOMES = {
  GARDEN_POND: {
    name: 'Garden Pond Shallows',
    water: {
      shallow: 0x38ded0, // Sparkling crystal turquoise shallows
      deep: 0x0a3c2e,    // Lush storybook emerald
      foam: 0xf0fdf4,    // Crisp clean froth
      radius: 39.5
    },
    lighting: {
      sunColor: 0xfff3d6,
      sunIntensity: 1.4,
      sunPos: new THREE.Vector3(32, 45, 24),
      hemiSkyColor: 0xd9f0ff,
      hemiGroundColor: 0x2d4f26,
      hemiIntensity: 0.75,
      fillColor: 0x70c1b3,
      fillIntensity: 0.45,
      fogColor: 0xcde8db,
      fogDensity: 0.0075
    },
    foliage: {
      leafDeep: 0x275926,
      leafMid: 0x3e8a34,
      leafBright: 0x5eb844,
      pine: 0x184223,
      goldenCanopy: 0x76ad36,
      willow: 0x82ba38,
      trunk: 0x5c4632
    },
    bed: {
      bedTint: 0xffffff,
      hillTint: 0xffffff
    },
    weather: WEATHER_TYPE.CLEAR_SUNNY
  },

  TROPICAL_LAGOON: {
    name: 'Tropical Lilypad Lagoon',
    water: {
      shallow: 0x22d3ee, // Radiant aqua cyan
      deep: 0x065f46,    // Warm tropical lagoon teal
      foam: 0xf0fdfa,
      radius: 41.0
    },
    lighting: {
      sunColor: 0xfef08a,
      sunIntensity: 1.55,
      sunPos: new THREE.Vector3(20, 52, 18),
      hemiSkyColor: 0xbae6fd,
      hemiGroundColor: 0x166534,
      hemiIntensity: 0.85,
      fillColor: 0x5eead4,
      fillIntensity: 0.50,
      fogColor: 0xdcfce7,
      fogDensity: 0.0065
    },
    foliage: {
      leafDeep: 0x15803d,
      leafMid: 0x22c55e,
      leafBright: 0x86efac,
      pine: 0x14532d,
      goldenCanopy: 0xa3e635,
      willow: 0x4ade80,
      trunk: 0x78350f
    },
    bed: {
      bedTint: 0xfef9c3,
      hillTint: 0xdcfce7
    },
    weather: WEATHER_TYPE.TROPICAL_BREEZE
  },

  AUTUMN_BOG: {
    name: 'The Murk Hollow Autumn Bog',
    water: {
      shallow: 0xd97706, // Amber peat / tea-stained water
      deep: 0x291807,    // Deep cedar tannin muck
      foam: 0xfef3c7,    // Warm amber froth
      radius: 38.0
    },
    lighting: {
      sunColor: 0xfde68a, // Soft diffused autumn sun
      sunIntensity: 1.15,
      sunPos: new THREE.Vector3(40, 32, -18),
      hemiSkyColor: 0xd97706,
      hemiGroundColor: 0x451a03,
      hemiIntensity: 0.65,
      fillColor: 0xb45309,
      fillIntensity: 0.40,
      fogColor: 0x5b2d0c, // Atmospheric russet bog fog
      fogDensity: 0.0115
    },
    foliage: {
      leafDeep: 0x7c2d12, // Burnt mahogany
      leafMid: 0xc2410c,  // Vibrant autumn russet
      leafBright: 0xf97316,// Golden pumpkin orange
      pine: 0x365314,     // Mossy olive pine
      goldenCanopy: 0xd97706,
      willow: 0xb45309,
      trunk: 0x451a03
    },
    bed: {
      bedTint: 0xdd9960,
      hillTint: 0xb86c38
    },
    weather: WEATHER_TYPE.AUTUMN_RAIN
  },

  DARK_FEN: {
    name: 'The Boss Fen',
    water: {
      shallow: 0x4d7c0f, // Murky virulent swamp green
      deep: 0x122304,    // Blackish peat mire
      foam: 0xdcfce7,    // Sickly pale lime froth
      radius: 36.5
    },
    lighting: {
      sunColor: 0x84cc16, // Dim sickly twilight
      sunIntensity: 0.90,
      sunPos: new THREE.Vector3(-15, 38, -35),
      hemiSkyColor: 0x1e293b,
      hemiGroundColor: 0x0f172a,
      hemiIntensity: 0.55,
      fillColor: 0x365314,
      fillIntensity: 0.35,
      fogColor: 0x172815, // Thick rolling swamp mist
      fogDensity: 0.0150
    },
    foliage: {
      leafDeep: 0x142805, // Blackened deadwood
      leafMid: 0x1e3a10,  // Dark cypress
      leafBright: 0x3f6212,// Spore moss
      pine: 0x0f1d0b,
      goldenCanopy: 0x274116,
      willow: 0x365314,
      trunk: 0x1c1917
    },
    bed: {
      bedTint: 0x526b48,
      hillTint: 0x283824
    },
    weather: WEATHER_TYPE.THUNDER_MIST
  },

  TWILIGHT_LAKE: {
    name: 'Whispering Lake Moonlight',
    water: {
      shallow: 0x38bdf8, // Luminescent sapphire shallows
      deep: 0x082f49,    // Deep oceanic midnight
      foam: 0xe0f2fe,    // Glowing moonlight sea-foam
      radius: 52.0       // Expansive open lake
    },
    lighting: {
      sunColor: 0xc7d2fe, // Cool silvery moonlight
      sunIntensity: 1.10,
      sunPos: new THREE.Vector3(-25, 48, 25),
      hemiSkyColor: 0x0f172a, // Deep midnight indigo sky
      hemiGroundColor: 0x020617,
      hemiIntensity: 0.60,
      fillColor: 0x1e3a8a,
      fillIntensity: 0.55,
      fogColor: 0x0f172a,
      fogDensity: 0.0085
    },
    foliage: {
      leafDeep: 0x0f233a, // Silvery night conifers
      leafMid: 0x173e5f,
      leafBright: 0x2563eb,
      pine: 0x082f49,
      goldenCanopy: 0x38bdf8,
      willow: 0x1d4ed8,
      trunk: 0x1e293b
    },
    bed: {
      bedTint: 0x5c799a,
      hillTint: 0x334860
    },
    weather: WEATHER_TYPE.TWILIGHT_FIREFLIES
  },

  RIVER_RAPIDS: {
    name: 'Misty River Rapids',
    water: {
      shallow: 0x67e8f9, // Frothy glacial alpine teal
      deep: 0x0e7490,    // Rushing alpine river
      foam: 0xffffff,    // Churning rapid spray
      radius: 40.0
    },
    lighting: {
      sunColor: 0xffffff, // Crisp cool alpine sunlight
      sunIntensity: 1.45,
      sunPos: new THREE.Vector3(30, 48, 20),
      hemiSkyColor: 0x93c5fd,
      hemiGroundColor: 0x1e293b,
      hemiIntensity: 0.80,
      fillColor: 0x38bdf8,
      fillIntensity: 0.45,
      fogColor: 0xcfdfe8, // Rushing water vapor mist
      fogDensity: 0.0095
    },
    foliage: {
      leafDeep: 0x164e63,
      leafMid: 0x0e7490,
      leafBright: 0x06b6d4,
      pine: 0x083344,
      goldenCanopy: 0x22d3ee,
      willow: 0x155e75,
      trunk: 0x292524
    },
    bed: {
      bedTint: 0x94a3b8, // River granite & slate gravel
      hillTint: 0x64748b
    },
    weather: WEATHER_TYPE.ALPINE_SPRAY
  },

  OCEAN_HORIZON: {
    name: 'The Great Ocean Sunset Horizon',
    water: {
      shallow: 0x38bdf8, // Royal coastal blue
      deep: 0x1e3a8a,    // Boundless ocean ultramarine
      foam: 0xfff7ed,    // Sunset-kissed sea crests
      radius: 56.0       // Expansive open ocean
    },
    lighting: {
      sunColor: 0xf97316, // Low radiant sunset sun
      sunIntensity: 1.65,
      sunPos: new THREE.Vector3(45, 14, -15),
      hemiSkyColor: 0x7c2d12, // Glowing peach & orange evening sky
      hemiGroundColor: 0x431407,
      hemiIntensity: 0.85,
      fillColor: 0xfb923c,
      fillIntensity: 0.60,
      fogColor: 0x9a3412, // Sunset haze
      fogDensity: 0.0070
    },
    foliage: {
      leafDeep: 0x3730a3,
      leafMid: 0x4f46e5,
      leafBright: 0x818cf8,
      pine: 0x312e81,
      goldenCanopy: 0xf59e0b,
      willow: 0xd97706,
      trunk: 0x3f3f46
    },
    bed: {
      bedTint: 0xfde68a, // Coastal sand dunes
      hillTint: 0xfbbf24
    },
    weather: WEATHER_TYPE.OCEAN_SWELL
  }
};

/**
 * BiomeManager: Coordinates lighting, water shader, foliage, terrain,
 * and atmospheric weather across all game levels.
 */
export class BiomeManager {
  constructor(pondWater, lighting, perimeterFoliage, pondBed, weatherSystem) {
    this.pondWater = pondWater;
    this.lighting = lighting;
    this.perimeterFoliage = perimeterFoliage;
    this.pondBed = pondBed;
    this.weatherSystem = weatherSystem;
    this.currentBiomeKey = 'GARDEN_POND';
  }

  applyBiome(biomeKey = 'GARDEN_POND') {
    const biome = BIOMES[biomeKey] || BIOMES.GARDEN_POND;
    this.currentBiomeKey = biomeKey;

    // 1. Water shader update
    if (this.pondWater) {
      this.pondWater.setBiomeColors(
        biome.water.shallow,
        biome.water.deep,
        biome.water.foam,
        biome.water.radius
      );
    }

    // 2. Lighting & Atmosphere update
    if (this.lighting) {
      this.lighting.applyLightingProfile(biome.lighting);
    }

    // 3. Foliage Palette update
    if (this.perimeterFoliage) {
      this.perimeterFoliage.applyBiomeColors(biome.foliage);
    }

    // 4. Ground Bed & Hill Terrain update
    if (this.pondBed) {
      this.pondBed.applyBiomeColors(biome.bed);
    }

    // 5. Weather Particle update
    if (this.weatherSystem) {
      this.weatherSystem.setWeather(biome.weather);
    }

    return biome;
  }
}
