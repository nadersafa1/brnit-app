import { adminClient, inferAdditionalFields, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import {
  ac,
  owner,
  client_admin,
  direct_admin,
  nutritionist,
  coach,
  member,
} from '@burn-app/auth/permissions'

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient({
      ac,
      roles: {
        owner,
        client_admin,
        direct_admin,
        nutritionist,
        coach,
        member,
      },
    }),
    inferAdditionalFields({
      user: {
        dob: {
          type: 'date',
          required: false,
        },
      },
    }),
  ],
})
