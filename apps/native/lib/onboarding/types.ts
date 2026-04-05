export type StepKind =
  | 'singleChoice'
  | 'multiChoiceChips'
  | 'text'
  | 'multiText'
  | 'feature'
  | 'congratulations'

export type ChoiceOption = {
  id: string
  label: string
  value: string
}

export type OnboardingStepBase = {
  id: string
  kind: StepKind
  title?: string
  description?: string
  required?: boolean
  next?: string
}

export type SingleChoiceStep = OnboardingStepBase & {
  kind: 'singleChoice'
  options: ChoiceOption[]
}

export type MultiChoiceChipsStep = OnboardingStepBase & {
  kind: 'multiChoiceChips'
  options: ChoiceOption[]
  max?: number
}

export type TextStep = OnboardingStepBase & {
  kind: 'text'
  placeholder?: string
}

export type TextFieldConfig = {
  id: string
  label: string
  placeholder: string
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'
  optional?: boolean
  suffix?: string
}

export type MultiTextStep = OnboardingStepBase & {
  kind: 'multiText'
  fields: TextFieldConfig[]
}

export type FeatureStep = OnboardingStepBase & {
  kind: 'feature'
  icon?: string
}

export type CongratulationsStep = OnboardingStepBase & {
  kind: 'congratulations'
}

export type OnboardingStep =
  | SingleChoiceStep
  | MultiChoiceChipsStep
  | TextStep
  | MultiTextStep
  | FeatureStep
  | CongratulationsStep

export type OnboardingAnswers = Record<string, string | string[]>
