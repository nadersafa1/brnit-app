/**
 * Organization access control (ac) and roles.
 *
 * To extend:
 * - New resource statements: add to createAccessControl({ ...defaultStatements, myResource: ['create','read','update','delete'] }).
 * - New role: ac.newRole({ ...memberAc.statements, myResource: ['read'] }), then add to roles in auth index and in web/native auth-client.
 */
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";
import { createAccessControl } from "better-auth/plugins/access";

export const ac = createAccessControl({
  ...defaultStatements,
});

export const owner = ac.newRole({
  ...ownerAc.statements,
});

export const admin = ac.newRole({
  ...adminAc.statements,
});

export const member = ac.newRole({
  ...memberAc.statements,
});
