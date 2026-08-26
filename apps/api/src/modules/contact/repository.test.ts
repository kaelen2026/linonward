import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../../shared/migrate.js";
import { connectPostgres } from "../../shared/postgres.js";
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

    it("has nothing to return for an id it never stored", async () => {
      await expect(repository.findById("inq_missing")).resolves.toBeUndefined();
    });

    it("reads back what was saved, field for field", async () => {
      await repository.save(inquiry);

      await expect(repository.findById("inq_1")).resolves.toEqual(inquiry);
    });

    it("keeps an omitted company omitted rather than turning it into null", async () => {
      const { company: _company, ...withoutCompany } = inquiry;
      await repository.save(withoutCompany);

      await expect(repository.findById("inq_1")).resolves.toEqual(withoutCompany);
    });

    it("stores inquiries independently", async () => {
      await repository.save(inquiry);
      await repository.save({ ...inquiry, id: "inq_2", name: "Wang Lin" });

      await expect(repository.findById("inq_1")).resolves.toMatchObject({ name: "林望" });
      await expect(repository.findById("inq_2")).resolves.toMatchObject({ name: "Wang Lin" });
    });
  });
}

contract("in-memory", () => Promise.resolve(createInMemoryInquiryRepository()));

// Runs only where a database is reachable: `docker compose -f apps/api/compose.yml
// up -d postgres`, then DATABASE_URL=… pnpm --filter @linonward/api test. CI has
// no service containers, so it exercises the in-memory contract above only.
const databaseUrl = process.env.DATABASE_URL;
const migrations = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../migrations",
);

describe.skipIf(!databaseUrl)("postgres", () => {
  const postgres = connectPostgres(databaseUrl ?? "");

  afterAll(async () => {
    await postgres.close();
  });

  contract("postgres", async () => {
    await migrate(postgres.sql, migrations);
    await postgres.sql`truncate table inquiries`;
    return createPostgresInquiryRepository(postgres.sql);
  });
});
