import { z } from 'zod';
export const TargetMarketIdentificationSchema = z.object({
  targetMarkets: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
});

export const TargetMarketAnalysisSchema = z.object({
  marketName: z.string(),
  marketSize: z.object({
    value: z.number(),
    currency: z.string(),
    unit: z.string(),
    year: z.number(),
  }),
  cagr: z.object({
    ratePercent: z.number(),
    period: z.object({
      startYear: z.number(),
      endYear: z.number(),
    }),
  }),
  keyHighlights: z.array(z.string()),
  saturation: z.object({
    stage: z.enum([
      'Oversaturated',
      'Saturated',
      'Neutral',
      'Emerging',
      'Stagnant',
    ]),
    competition: z.enum(['Low', 'Moderate', 'High']),
    opportunityLevel: z.enum(['Low', 'Moderate', 'High']),
  }),
  opportunities: z.array(z.string()),
  challenges: z.array(z.string()),
  sources: z.array(z.string()),
});

export const MarketSegmentIdentificationSchema = z.object({
  marketSegments: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      segmentSize: z.number(),
      questionAnswers: z.array(
        z.object({
          score: z.number(),
        }),
      ),
    }),
  ),
});

export const CustomerPersonaGenerationSchema = z.object({
  name: z.string(),
  occupation: z.string(),
  gender: z.enum(['male', 'female']),
  maritalStatus: z.enum([
    'single',
    'married',
    'divorced',
    'widowed',
    'separated',
    'engaged',
  ]),
  keyTraits: z.array(z.string()),
  personalityType: z.string(),
  purchaseDrivers: z.array(z.string()),
  preferredBrands: z.array(z.string()),
  biography: z.string(),
  painPoints: z.array(z.string()),
  communityTouchpoints: z.array(z.string()),
  purchaseFrequency: z.object({
    interval: z.string(),
    period: z.string(),
    reason: z.string(),
  }),
});

export const CRMFilterGenerationSchema = z.object({
  competitorResearchFilters: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['location', 'industry', 'investmentStage', 'other']),
    }),
  ),
});

export const CRMResearchGenerationSchema = z.object({
  customerResearchResults: z.array(
    z.object({
      companyName: z.string(),
      companySize: z.string(),
      contactDetails: z.string(),
      investmentSeries: z.string(),
      location: z.string(),
    }),
  ),
});

export const BusinessModelCanvasSchema = z.object({
  businessModels: z.array(
    z.object({
      index: z.number(),
      businessModelTitle: z.string(),
      overview: z.string(),
      implementationDetails: z.string(),
      competitionAndDefensibility: z.string(),
      riskAnalysis: z.string(),
      customerDescription: z.object({
        volume: z.enum(['high', 'medium', 'low']),
        value: z.enum(['high', 'medium', 'low']),
        churn: z.enum(['high', 'medium', 'low']),
      }),
    }),
  ),
});

export const CostBasedPricingModelSchema = z.object({
  costBasedPricingModel: z.array(
    z.object({
      scale: z.enum(['proofOfConcept', 'marketEntry', 'marketEstablished']),
      costItems: z.array(
        z.object({
          type: z.enum(['direct', 'indirect']),
          itemName: z.string(),
          itemDescription: z.string(),
          costUSD: z.number(),
        }),
      ),
      totalCostUSD: z.number(),
    }),
  ),
});
