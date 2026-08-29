import { account, session, user, verification } from "./auth.js";
import { inquiries } from "./contact.js";
import { articles } from "./content.js";
import { accountRelations, sessionRelations, userRelations } from "./relations.js";

export { account, session, user, verification } from "./auth.js";
export { inquiries } from "./contact.js";
export { articles } from "./content.js";
export { accountRelations, sessionRelations, userRelations } from "./relations.js";

export const authSchema = {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
};

export const schema = { ...authSchema, articles, inquiries };
