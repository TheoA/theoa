export const config = {
    // Initial Game State
    initialCash: 10000000,
    initialDebt: 2000000,
    initialHeat: 20,
    maxTurns: 30,

    // Finance
    baseInterestRate: 0.10,
    shellCorpRate: 0.05,
    creditLimit: 10000000,
    shellCorpCreditLimit: 20000000,

    // Acquisition
    acquisitionFee: 0.10,
    leveragedDownPayment: 0.20,

    // Actions - Strip
    stripYield: 0.50,
    stripViabilityHit: 25,
    stripRentCost: 150000,
    stripValuationMultiplier: 0.55,
    stripValuationPenalty: 500000,

    // Actions - Recap
    recapYield: 0.50,
    recapViabilityHit: 15,
    recapInterestRate: 0.12,

    // Actions - Cut
    cutSavings: 150000,
    cutViabilityHit: 10,
    cutHeatGain: 15,

    // Actions - Bankrupt
    bankruptHeatGain: 40,

    // Events
    luigiSuppressChance: 0.8,
    exposeHeatGain: 35,
    exposeCreditFreeze: 3,
    marketCrashTurns: 3,
    strikeProfitPenalty: 300000,
    viabilityCostPerMillion: 20,
    eventRollBase: 100,
    upgradeChance: 0.35,

    // Upgrades
    bribedSenatorHeatMult: 0.5,

    // Location acquisition counts
    locationAcquisitionCounts: {
        'Cayman Islands': 2,
        'Wall Street (NYC)': 4,
        default: 3
    },

    // Location multipliers
    svVolatilityRange: 0.4,
    defaultVolatilityRange: 0.1,
    marketCrashValuationMultiplier: 0.7,
    valuationFloor: 0.3,

    // Operating
    operatingProfitDivisor: 12,

    // Automatic bankruptcy heat spike
    autoBankruptcyHeatGain: 35,

    // Event costs
    secSettlementCost: 2500000,
    secLawyerCost: 1000000,
    newspaperKillStoryCost: 200000,
    assassinationHospitalBill: 2000000,
    unionBusterValuationMultiplier: 0.5,
    unionBusterStrikeTurns: 3,
    unionBusterHeatGain: 15
};