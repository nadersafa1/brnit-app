import type { OnboardingAnswers, OnboardingStep } from './types'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    kind: 'feature',
    title: 'Welcome to Brnit',
    description:
      'Your personalized nutrition and fitness journey starts here.',
    icon: 'flame',
  },
  {
    id: 'lengthUnit',
    kind: 'singleChoice',
    required: true,
    title: 'Units for\n measurements',
    description: 'You can change this anytime in Profile.',
    options: [
      { id: 'metric', label: 'Metric (cm, kg)', value: 'metric' },
      { id: 'imperial', label: 'Imperial (ft, lb)', value: 'imperial' },
    ],
  },
  {
    id: 'goal',
    kind: 'singleChoice',
    title: "What's your\n main goal?",
    description:
      'This helps your coach select the right plan for you.',
    options: [
      { id: 'lose-weight', label: 'Lose weight', value: 'lose_weight' },
      { id: 'build-muscle', label: 'Build muscle', value: 'build_muscle' },
      { id: 'maintain', label: 'Maintain weight', value: 'maintain' },
      {
        id: 'improve-health',
        label: 'Improve overall health',
        value: 'improve_health',
      },
      {
        id: 'energy',
        label: 'Increase energy levels',
        value: 'increase_energy',
      },
    ],
  },
  {
    id: 'activity-level',
    kind: 'singleChoice',
    title: 'How active\n are you?',
    description: 'Your current activity level helps us calibrate your plan.',
    options: [
      {
        id: 'sedentary',
        label: 'Sedentary (little to no exercise)',
        value: 'sedentary',
      },
      {
        id: 'light',
        label: 'Lightly active (1–2 days/week)',
        value: 'lightly_active',
      },
      {
        id: 'moderate',
        label: 'Moderately active (3–4 days/week)',
        value: 'moderately_active',
      },
      {
        id: 'very',
        label: 'Very active (5–6 days/week)',
        value: 'very_active',
      },
      {
        id: 'athlete',
        label: 'Athlete (daily intense training)',
        value: 'athlete',
      },
    ],
  },
  {
    id: 'measurements',
    kind: 'multiText',
    title: "Let's get your\n baseline",
    description: 'These numbers help track your body composition progress.',
    fields: [
      {
        id: 'height',
        label: 'Height',
        placeholder: '170',
        keyboardType: 'numeric',
        suffix: 'cm',
      },
      {
        id: 'weight',
        label: 'Current weight',
        placeholder: '75',
        keyboardType: 'decimal-pad',
        suffix: 'kg',
      },
      {
        id: 'target-weight',
        label: 'Target weight',
        placeholder: '70',
        keyboardType: 'decimal-pad',
        suffix: 'kg',
        optional: true,
      },
    ],
  },
  {
    id: 'age-gender',
    kind: 'singleChoice',
    title: 'Your age range',
    description: 'This affects your nutritional needs and plan intensity.',
    options: [
      { id: '18-25', label: '18–25', value: '18-25' },
      { id: '26-35', label: '26–35', value: '26-35' },
      { id: '36-45', label: '36–45', value: '36-45' },
      { id: '46-55', label: '46–55', value: '46-55' },
      { id: '55+', label: '55+', value: '55+' },
    ],
  },
  {
    id: 'gender',
    kind: 'singleChoice',
    title: 'Your gender',
    description: 'This helps calculate your baseline metabolic rate.',
    options: [
      { id: 'male', label: 'Male', value: 'male' },
      { id: 'female', label: 'Female', value: 'female' },
      {
        id: 'prefer-not',
        label: 'Prefer not to say',
        value: 'prefer_not_to_say',
      },
    ],
  },
  {
    id: 'dietary-preferences',
    kind: 'multiChoiceChips',
    title: 'Any dietary\n preferences?',
    description: 'Helps your admin assign a compatible meal plan.',
    options: [
      { id: 'none', label: 'No restrictions', value: 'none' },
      { id: 'vegetarian', label: 'Vegetarian', value: 'vegetarian' },
      { id: 'vegan', label: 'Vegan', value: 'vegan' },
      { id: 'pescatarian', label: 'Pescatarian', value: 'pescatarian' },
      { id: 'halal', label: 'Halal', value: 'halal' },
      { id: 'kosher', label: 'Kosher', value: 'kosher' },
      { id: 'keto', label: 'Keto', value: 'keto' },
      { id: 'low-carb', label: 'Low-carb', value: 'low_carb' },
      { id: 'gluten-free', label: 'Gluten-free', value: 'gluten_free' },
      { id: 'dairy-free', label: 'Dairy-free', value: 'dairy_free' },
      { id: 'nut-allergy', label: 'Nut allergy', value: 'nut_allergy' },
    ],
  },
  {
    id: 'meal-frequency',
    kind: 'singleChoice',
    title: 'How many meals\n per day?',
    description: 'We align your diet plan to your eating routine.',
    options: [
      { id: '2', label: '2 meals', value: '2' },
      { id: '3', label: '3 meals', value: '3' },
      { id: '4-5', label: '4–5 smaller meals', value: '4-5' },
      { id: 'if', label: 'Intermittent fasting', value: 'intermittent' },
    ],
  },
  {
    id: 'exercise-types',
    kind: 'multiChoiceChips',
    title: 'What exercise\n do you enjoy?',
    description: 'Helps assign an exercise plan you will actually stick to.',
    options: [
      { id: 'weights', label: 'Weight training', value: 'weight_training' },
      { id: 'cardio', label: 'Cardio', value: 'cardio' },
      { id: 'hiit', label: 'HIIT', value: 'hiit' },
      { id: 'yoga', label: 'Yoga / Pilates', value: 'yoga_pilates' },
      { id: 'swimming', label: 'Swimming', value: 'swimming' },
      { id: 'running', label: 'Running / Jogging', value: 'running' },
      { id: 'walking', label: 'Walking', value: 'walking' },
      { id: 'sports', label: 'Sports', value: 'sports' },
      { id: 'home', label: 'Home workouts', value: 'home_workouts' },
      { id: 'gym', label: 'Gym workouts', value: 'gym_workouts' },
      { id: 'none-yet', label: 'None yet', value: 'none_yet' },
    ],
  },
  {
    id: 'challenges',
    kind: 'multiChoiceChips',
    title: 'What challenges\n have you faced?',
    description:
      'Understanding your blockers helps your coach personalize support.',
    options: [
      { id: 'consistency', label: 'Staying consistent', value: 'consistency' },
      { id: 'nutrition', label: 'Understanding nutrition', value: 'nutrition' },
      { id: 'time', label: 'Time management', value: 'time' },
      { id: 'motivation', label: 'Motivation', value: 'motivation' },
      { id: 'meal-prep', label: 'Meal prep', value: 'meal_prep' },
      { id: 'gym-intimidation', label: 'Gym intimidation', value: 'gym_fear' },
      { id: 'injury', label: 'Injury concerns', value: 'injury' },
      { id: 'none', label: 'None', value: 'none' },
    ],
  },
  {
    id: 'notifications',
    kind: 'multiChoiceChips',
    title: 'When should\n we remind you?',
    description: 'Reminders keep you on track without being annoying.',
    options: [
      { id: 'meals', label: 'Meal logging', value: 'meal_logging' },
      { id: 'workout', label: 'Workout reminders', value: 'workouts' },
      { id: 'progress', label: 'Weekly progress', value: 'weekly_progress' },
      { id: 'water', label: 'Hydration', value: 'hydration' },
      { id: 'minimal', label: 'Minimal notifications', value: 'minimal' },
    ],
  },
  {
    id: 'congratulations',
    kind: 'congratulations',
    title: "You're all set!",
    description:
      'Your admin will review your profile and assign a personalized plan.',
  },
]

export const STEP_INDEX_BY_ID = Object.fromEntries(
  ONBOARDING_STEPS.map((step, index) => [step.id, index]),
)

export function getNextStepIndex(
  step: OnboardingStep,
  currentIndex: number,
): number {
  if (step.next) {
    const nextIndex = STEP_INDEX_BY_ID[step.next]
    if (typeof nextIndex === 'number') return nextIndex
  }
  return currentIndex + 1
}

export function isStepComplete(
  step: OnboardingStep,
  answers: OnboardingAnswers,
): boolean {
  if (!step.required) return true

  const answer = answers[step.id]

  if (step.kind === 'singleChoice') {
    return typeof answer === 'string' && answer.length > 0
  }

  if (step.kind === 'multiChoiceChips') {
    return Array.isArray(answer) && answer.length > 0
  }

  if (step.kind === 'text') {
    return typeof answer === 'string' && answer.trim().length > 0
  }

  return true
}
