import { AccountPreferencesForm } from './account-preferences-form'

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Preferences for how measurements appear in Brnit.
        </p>
      </div>
      <AccountPreferencesForm />
    </div>
  )
}
