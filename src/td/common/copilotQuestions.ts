export const CopilotQuestions = {
  primaryGoal: {
    title: 'Technology Overview',
    description:
      "You should be as clear and direct with your answers as possible. Avoid using connectives like 'and' or 'but' unless absolutely necessary. If there are multiple answers to the questions, please select the single most important or relevant answer.",
    questions: [
      {
        question:
          'Who does this technology solve a problem for? What is the intended target audience?',
        description:
          'Be as specific as you can. For example: In the case of a new crop strain this might be ‘Farmers in the United Kingdom whose crop is composed of >50% wheat’',
      },
      {
        question:
          'What will your technology do? What is the intended outcome for the target stakeholders and how will it deliver on this outcome?',
        description:
          "E.g. 'We want to develop a new bio-based material fashioned as baby clothing that detects hormonal changes in a baby's sweat and/or tears that helps mothers quickly identify their baby's needs. It changes colour based on the different needs of the baby (e.g. hunger, tiredness, fear, discomfort) so that the baby can more effectively communicate to the mother despite being unable to talk or gesture.'",
      },
      {
        question: 'How will it improve upon existing solutions?',
        description:
          'What do the existing solutions for this problem do and how will you ensure yours solves the problem better, cheaper or faster?',
      },
      {
        question: "Are there any quantifiable targets that you're aiming for?",
        description:
          "Numbers help us measure success and they also give us a target to work towards to optimise efficiencies, yields, costs etc. For example: 'Our biosensor must have a 95% or greater detection accuracy to compete with existing chemical sensors'.",
      },
      {
        question: 'Do you have a timeline in mind?',
        description:
          'When would you like to complete this project? Are there any upcoming awards or exhibitions you would like to demonstrate a prototype at?',
      },
      {
        question: 'What does success look like for your solution?',
        description:
          "What quantitative or qualitative outcomes will determine that your work is complete? E.g. 'We want to scale our carbon capture technology to actively remove 1Gt of CO2 per year in the Northern Hemisphere'.",
      },
      {
        question:
          "Is the solution's primary purpose to produce a tangible result (e.g. a product/material) or something intangible (e.g. confidence/status)?",
        description: '',
      },
    ],
  },
  criticalSubGoals: {
    title: 'Secondary Goals',
    description:
      'Secondary goals are additional objectives that are achieved in support of or as a result of solving the primary problem. For example, your primary goal might be ‘Decrease the development time required to prototype new GM crop species’. In this case, some secondary goals might be ‘Increase the number of new GM crop species developed and deployed by our customers per annum’ or ‘Reduce the cost associated with R&D of new GM crop species’. Place them in descending order of importance (highest to lowest).',
    questions: [],
  },
  mustHaveFeatures: {
    title: 'Must-Have Features',
    description:
      'Only include features/characteristics which are absolutely essential to the primary goal. Please place them in descending order of importance (highest importance to lowest). E.g. ‘Must be 100% biodegradable’.',
    questions: [],
  },
  niceToHaveFeatures: {
    title: 'Nice-to-Have Features',
    description:
      'These are features that would be beneficial to the primary or secondary goals but are not essential. Please place them in descending order of importance (highest importance to lowest).',
    questions: [],
  },
  constraints: {
    title: 'Constraints',
    description:
      'What are the constraints that you must work within? These could be technical, financial, or regulatory constraints. Please place them in descending order of importance (highest importance to lowest).\nFor example: ‘The detection signal will need an amplification mechanism to ensure that the whole garment changes color visibly in response to localized signals.’',
    questions: [],
  },
  status: {
    title: 'Status',
    description:
      'Please help us understand where this project is currently at and what progress (if any) has been made towards the primary goal.',
    questions: [
      {
        question:
          'What Technology Readiness Level (TRL) is this project? Give your answer as a number from 1-9.',
        description: '',
      },
      {
        question: 'Please justify why this project is currently at a TRL [X].',
        description: '',
      },
      {
        question:
          'Do you have any data/results that support the claims made for TRL [X]?',
        description: '',
      },
      {
        question:
          'Do you have any data/results that highlight the current/projected performance of the system?',
        description: '',
      },
      {
        question:
          'What does the current roadmap look like? What is next on the horizon?',
        description: '',
      },
    ],
  },
};
