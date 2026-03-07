# Roles

## App-level roles (`user.role`)

Stored on the `user` table. No schema change required; allowed values are enforced in app logic.

| Role           | Description |
|----------------|-------------|
| **admin**      | App admin. Can create organizations and impersonate users. |
| **nutritionist** | Can be invited to organizations as org nutritionist. |
| **coach**      | Can be invited to organizations as org coach. |
| **user**       | Default. Can be invited as member, client_admin, or direct_admin when allowed. |

## Organization-level roles (`member.role`)

Used when inviting members and for org-scoped access control. Defined in `packages/auth/src/permissions.ts`.

| Role             | Description |
|------------------|-------------|
| **owner**        | Creator of the org; full control (settings, members, invitations). |
| **client_admin** | Client-side org admin (e.g. HR). Can invite members (only as member). Cannot change roles or remove members. |
| **direct_admin** | Brnit staff, assigned by app admin. Intended for weekly InBody readings (app logic separate). |
| **nutritionist** | Intended to add nutrition plans for the org (app logic separate). |
| **coach**        | Intended to add exercises for the org (app logic separate). |
| **member**       | Competing member; default for participants. |

## Who can invite

- **Create organization:** Only `user.role === 'admin'`.
- **Invite to org:** Owner, direct_admin, and client_admin can invite. Owner and direct_admin can invite with any role; client_admin can only invite as member.

## Who can list / remove / update members

- **List members, remove member, update member role:** Owner and direct_admin only (plus app admin). Client_admin cannot change roles or remove members. The Better Auth organization plugin enforces these permissions; the web dashboard shows these actions only for users with these roles.

## Who can manage body composition assessments

- **Create, list, update, delete assessments:** Owner and direct_admin only (plus app admin). Direct admins add InBody-style body composition readings (height, body fat %, weight, BMI, muscle mass, visceral fat, body water) to members. Optional InBody result image can be attached via Cloudinary.

## Invitation roles

When calling `authClient.organization.inviteMember({ email, role, organizationId })`, `role` must be one of:

`client_admin` | `direct_admin` | `nutritionist` | `coach` | `member`

The creator of the org is always `owner`; they are not invited.
