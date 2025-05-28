export const technologyReadinessLevelMarks = [
  {
    value: 1,
    label: '1. Basic Principles Observed',
    description:
      'Observations and reported findings provide the scientific underpinning for potential future technologies',
  },
  {
    value: 2,
    label: '2. Technology Concept Formulated',
    description:
      'Conceptual work and the identification of the application are developed based on the observations from TRL 1.',
  },
  {
    value: 3,
    label: '3. Experimental Proof of Concept',
    description:
      'Proof of concept is established through experimentation. At this stage, the focus shifts from theoretical work to experimental validation.',
  },
  {
    value: 4,
    label: '4. Technology Validated in Lab',
    description:
      'The technology is tested in a lab environment to establish that it will work according to the concept.',
  },
  {
    value: 5,
    label: '5. Technology Validated in Relevant Environment',
    description:
      'Further testing validates the technology in a simulated operational environment, moving beyond the lab.',
  },
  {
    value: 6,
    label: '6. Technology Demonstrated in Relevant Environment',
    description:
      'A prototype or system is tested in a relevant environment that closely matches the intended operational conditions. This is a pivotal step for demonstrating practical feasibility.',
  },
  {
    value: 7,
    label: '7. System Prototype Demonstrated in Operational Environment',
    description:
      'A prototype is tested in its intended operational environment to demonstrate performance in the actual conditions in which it will be used.',
  },
  {
    value: 8,
    label: '8. System Complete and Qualified',
    description:
      'The system is finalized and fully qualified through testing. It meets all the necessary standards and is ready for production.',
  },
  {
    value: 9,
    label: '9. Actual System Proven in Operational Environment',
    description:
      'The final stage where the technology is fully integrated and in regular operation. It has been proven to work reliably over time and is ready for full-scale deployment.',
  },
];

export const technologyReadinessLevelGroups = [
  {
    value: 'Early',
    label: 'Early (TRL 1-3)',
    description:
      'Covers TRL stages 1 to 3, where basic principles are observed, technology concepts are formulated, and experimental proof of concept is established.',
  },
  {
    value: 'Middle',
    label: 'Middle (TRL 4-6)',
    description:
      'Covers TRL stages 4 to 6, where technology is validated in lab and relevant environments, and demonstrated in relevant environments.',
  },
  {
    value: 'Late',
    label: 'Late (TRL 7-9)',
    description:
      'Covers TRL stages 7 to 9, where system prototypes are demonstrated in operational environments, systems are completed and qualified, and actual systems are proven in operational environments.',
  },
  {
    value: 'Indiscriminate',
    label: 'All Stages',
    description:
      'The funding opportunity places no limits on TRLs, encouraging applications across the entire spectrum of technology development—from initial concepts to fully validated solutions.',
  },
];
