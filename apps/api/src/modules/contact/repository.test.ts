import { connectDatabase, migrationDirectories } from "@linonward/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../../shared/migrate.js";
import { createPostgresInquiryRepository } from "./postgres-repository.js";
import {
  createInMemoryInquiryRepository,
  type Inquiry,
  type InquiryRepository,
} from "./repository.js";

const inquiry: Inquiry = {
  id: "inq_1",
  name: "林望",
  email: "lin.wang@example.com",
  company: "Example Ltd",
  message: "想了解贵司的交付流程，方便安排一次沟通吗？",
  locale: "zh",
  receivedAt: "2026-08-26T07:00:00.000Z",
};

/**
 * Both adapters answer the same questions, so both are asked the same ones. A
 * port with one tested implementation is a port in name only.
 */
function contract(name: string, open: () => Promise<InquiryRepository>) {
  describe(`${name} InquiryRepository`, () => {
    let repository: InquiryRepository;

    beforeEach(async () => {
      repository = await open();
    });

    it("accepts an inquiry for durable storage", async () => {
      await expect(repository.save(inquiry)).resolves.toBeUndefined();
    });
  });
}

contract("in-memory", () => Promise.resolve(createInMemoryInquiryRepository()));

// Runs only where a database is reachable: `docker compose -f apps/api/compose.yml
// up -d postgres`, then DATABASE_URL=… pnpm --filter @linonward/api test. CI has
// no service containers, so it exercises the in-memory contract above only.
const databaseUrl = process.env.DATABASE_URL;
const migrations = migrationDirectories().legacy;

describe.skipIf(!databaseUrl)("postgres", () => {
  const postgres = connectDatabase(databaseUrl ?? "");

  afterAll(async () => {
    await postgres.close();
  });

  contract("postgres", async () => {
    await migrate(postgres.sql, migrations);
    await postgres.sql`truncate table inquiries`;
    return createPostgresInquiryRepository(postgres.db);
  });
});
